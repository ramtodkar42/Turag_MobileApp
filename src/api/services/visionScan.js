// ⚠️ DEV / TEST ONLY — direct OpenAI RC/VIN photo reading, a faithful port of the
// web's server actions (apps/web/src/app/inspect/[id]/actions.ts:
// analyzeVinPlateImage / analyzeRcImage, model gpt-4o-mini). Same prompts, same
// output schema, same VIN honesty gate — so the mobile forms get identical fields.
//
// Why this exists: staging has no /identity-extract REST endpoint, and the web's
// extraction is a Next.js server action the app can't call. This calls OpenAI
// directly with the key in config. The key ships inside the app, so this is for
// internal testing only; production must read the photo through a backend.
import { OPENAI_API_KEY } from '../config';
import {
  COSMETIC_AREAS,
  COSMETIC_SEVERITIES,
  DAMAGE_TYPE_VALUES,
  M1_DENT_PROMPT_VERSION,
  PANEL_GROUPS,
  normalizeDamageResult,
} from '../../vendor/selfInspectionLogic';
import { damagePrompt } from './m1DamagePrompt';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const TIMEOUT_MS = 60000;

// Same prompt text as the web.
const VIN_PROMPT =
  'This photo should show a vehicle VIN/chassis plate or chassis/engine-number stamping. If it is NOT a VIN/chassis/engine marking, return isVinPlate=false with all other fields null. Otherwise transcribe the VIN/chassis number (and the engine number ONLY when visibly present in the same image) exactly as written — return null for anything unreadable. Never guess or reconstruct characters.';
const RC_PROMPT =
  'Analyze this image of a vehicle Registration Certificate (RC). Extract the key details strictly as written on the document. Transcribe only what is clearly legible — return null for any field that is unreadable or absent. Never guess.';

// JSON Schemas for OpenAI Structured Outputs (strict): every property required,
// nullable via ["type","null"], additionalProperties:false. Mirrors the web zod.
const str = { type: ['string', 'null'] };
const num = { type: ['number', 'null'] };
const VIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isVinPlate', 'vin', 'engineNumber', 'confidence'],
  properties: { isVinPlate: { type: 'boolean' }, vin: str, engineNumber: str, confidence: num },
};
const RC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'isRcDocument', 'registrationNumber', 'chassisNumber', 'engineNumber', 'ownerName',
    'mfgYear', 'regDate', 'make', 'model', 'variant', 'fuel',
  ],
  properties: {
    isRcDocument: { type: 'boolean' },
    registrationNumber: str, chassisNumber: str, engineNumber: str, ownerName: str,
    mfgYear: num, regDate: str, make: str, model: str, variant: str, fuel: str,
  },
};

const callOpenAI = async (prompt, schema, schemaName, imageBase64, maxTokens = 600) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema },
        },
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned no content');
  }
  return JSON.parse(content);
};

// VIN / RC read. Returns the SAME shape the web returns (and the mobile forms
// already consume): VIN → { isVinPlate, vin, engineNumber, confidence };
// RC → { isRcDocument, registrationNumber, chassisNumber, engineNumber, make,
// model, variant, fuel, mfgYear, regDate, ownerName }.
export const scanIdentityWithOpenAI = async (kind, imageBase64) => {
  if (kind === 'VIN') {
    const obj = await callOpenAI(VIN_PROMPT, VIN_SCHEMA, 'vin_plate', imageBase64);
    // Honesty gate (mirrors the web): a non-VIN image carries nothing.
    if (!obj.isVinPlate) {
      return { isVinPlate: false, vin: null, engineNumber: null, confidence: null };
    }
    const confidence =
      obj.confidence == null
        ? null
        : obj.confidence <= 1
          ? Math.round(obj.confidence * 100)
          : Math.round(obj.confidence);
    return {
      isVinPlate: true,
      vin: obj.vin?.trim() ? obj.vin.trim() : null,
      engineNumber: obj.engineNumber?.trim() ? obj.engineNumber.trim() : null,
      confidence,
    };
  }
  // RC: returned as-is (the owner name is read but the UI never shows/saves it).
  return callOpenAI(RC_PROMPT, RC_SCHEMA, 'rc_document', imageBase64);
};

// --- Odometer (web: analyzeOdometerImage) ---------------------------------------

const ODOMETER_PROMPT =
  'Analyze this dashboard photo. Extract the total kilometers (odometer) reading and any error messages.';
const ODOMETER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['isOdometerVisible', 'kilometers', 'errorText'],
  properties: {
    isOdometerVisible: {
      type: 'boolean',
      description: 'True if a car dashboard with an odometer reading is visible.',
    },
    kilometers: {
      type: ['number', 'null'],
      description: 'The total distance travelled in kilometres (KM). Ignore trip meters. Null if illegible.',
    },
    errorText: {
      type: ['string', 'null'],
      description: 'If there is an error message visible on the dashboard, extract it here.',
    },
  },
};

// Reads the odometer from a dashboard photo: { isOdometerVisible, kilometers, errorText }.
export const analyzeOdometerWithOpenAI = imageBase64 =>
  callOpenAI(ODOMETER_PROMPT, ODOMETER_SCHEMA, 'odometer', imageBase64);

// --- Walkaround damage (web: analyzeDamageImageV2, prompt m1-dent-v4) -----------

const PANEL_CODES = [...PANEL_GROUPS.PASSENGER, ...PANEL_GROUPS.TWO_WHEELER];
const rupees = description => ({ type: 'integer', description });
const DAMAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'hasDamage', 'part', 'type', 'severity', 'confidence',
    'partRupees', 'labourRupees', 'paintRupees', 'reasoning', 'cosmetic',
  ],
  properties: {
    hasDamage: {
      type: 'boolean',
      description:
        'True ONLY when visible damage (dent, scratch, crack, rust, missing part) is actually present on the panel. A clean panel MUST be false — never invent damage.',
    },
    part: {
      type: 'string',
      enum: PANEL_CODES,
      description: 'Damaged panel from the 40-code taxonomy. Pick the closest visible panel.',
    },
    type: { type: 'string', enum: DAMAGE_TYPE_VALUES, description: 'Damage type, or NONE when hasDamage is false.' },
    severity: {
      type: 'string',
      enum: ['NONE', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'],
      description:
        'Damage severity, or NONE when hasDamage is false. CRITICAL only for safety/structure-threatening damage.',
    },
    confidence: { type: 'number', description: 'Confidence 0-100 (percent, e.g. 82).' },
    partRupees: rupees('New-part price in whole INR rupees (0 when no part needed). E.g. 2500 means ₹2,500.'),
    labourRupees: rupees('Labour in whole INR rupees. E.g. 1200 means ₹1,200.'),
    paintRupees: rupees('Paint in whole INR rupees. E.g. 800 means ₹800.'),
    reasoning: {
      type: 'string',
      description:
        'Concise visual evidence: what is visibly seen and why this part/severity/cost for this brand+age.',
    },
    cosmetic: {
      type: 'array',
      description:
        'Visible AGING/WEAR the damage taxonomy misses — faded/discoloured/peeling paint, hazy lamps, worn/cracked/aged tyres, worn glass or interior. Empty when nothing is visible. Report ONLY what THIS photo shows; areas you cannot judge stay out (never mark GOOD by default).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['area', 'observation', 'severity'],
        properties: {
          area: {
            type: 'string',
            enum: COSMETIC_AREAS,
            description:
              'Aging/wear area: PAINT (fade/discolour/peel), LAMPS (haze/yellow), GLASS, TYRES_WHEELS (wear/cracks/age), PANELS (non-damage wear), INTERIOR (if shown), OTHER.',
          },
          observation: {
            type: 'string',
            description: 'What is visibly aged/worn, in a few words (e.g. "roof paint heavily faded").',
          },
          severity: { type: 'string', enum: COSMETIC_SEVERITIES, description: 'Aging severity for this area.' },
        },
      },
    },
  },
};

const clampRupees = value => Math.min(Math.max(Math.round(Number(value) || 0), 0), 500000);

// The same vehicle / question blocks the web sends (no plate / VIN / GPS).
const damageBlocks = (ctx = {}) => {
  const v = ctx.vehicle ?? {};
  const snapshot = (ctx.m1Snapshot ?? []).map(s => `${s.code}: ${s.label}`).join(' | ');
  const vehicleBlock = [
    `Make: ${v.make ?? 'Unknown'}`,
    `Model: ${v.model ?? 'Unknown'}`,
    `Variant: ${v.variant ?? 'Unknown'}`,
    `Category: ${v.category ?? 'Unknown'}`,
    `Fuel: ${v.fuel ?? 'Unknown'}`,
    `BodyType: ${v.bodyType ?? 'Unknown'}`,
    `Segment: ${v.segment ?? 'Unknown'} (${v.segmentTier ?? 'BUDGET'})`,
    `Ex-showroom: ${v.baseExShowroomMinor != null ? `₹${Math.round(v.baseExShowroomMinor / 100)}` : 'Unknown'}@${v.referenceYear ?? '?'}`,
    `MFG: ${v.mfgYear ?? 'Unknown'} (age ${v.ageYears ?? '?'}y)`,
    `Odometer: ${v.odometerKm ?? 'Unknown'} km | Owners: ${v.ownerCount ?? 'Unknown'}`,
  ].join('\n');
  const questionBlock = [
    `Item: ${ctx.itemCode ?? '?'} - ${ctx.itemLabel ?? '?'}`,
    `AnswerType: ${ctx.answerType ?? '?'} | Shot: ${ctx.shotHint ?? '?'}`,
    `Checklist v${ctx.checklistVersion ?? '?'} M1: ${snapshot || 'n/a'}`,
  ].join('\n');
  return { vehicleBlock, questionBlock };
};

// One walkaround photo -> the web's damage result: { hasDamage, part, type,
// severity, confidence, partMinor, labourMinor, paintMinor, repairCostMinor,
// reasoning, cosmetic, promptVersion }. No damage -> severity NONE, costs 0
// (the web's code-level gate, normalizeDamageResult). Advisory only.
// ctx: { vehicle, itemCode, itemLabel, answerType, shotHint, checklistVersion }.
export const analyzeDamageWithOpenAI = async (imageBase64, ctx = {}) => {
  const prompt = damagePrompt({ M1_DENT_PROMPT_VERSION, ...damageBlocks(ctx) });
  const object = await callOpenAI(prompt, DAMAGE_SCHEMA, 'damage_v2', imageBase64, 900);
  // Models sometimes return 0-1 fractions despite the 0-100 contract.
  const raw = Number(object.confidence) || 0;
  const confidence = Math.min(100, Math.max(0, raw <= 1 ? Math.round(raw * 100) : Math.round(raw)));
  const part = clampRupees(object.partRupees);
  const labour = clampRupees(object.labourRupees);
  const paint = clampRupees(object.paintRupees);
  const cosmetic = (object.cosmetic ?? []).slice(0, 4);
  const reasoning = String(object.reasoning ?? '').slice(0, 280);
  const gated = normalizeDamageResult({
    hasDamage: object.hasDamage,
    severity: object.severity,
    partMinor: part * 100,
    labourMinor: labour * 100,
    paintMinor: paint * 100,
    repairCostMinor: (part + labour + paint) * 100,
  });
  if (!gated.hasDamage) {
    return {
      hasDamage: false,
      part: object.part,
      type: 'NONE',
      severity: 'NONE',
      confidence,
      partMinor: 0,
      labourMinor: 0,
      paintMinor: 0,
      repairCostMinor: 0,
      reasoning,
      cosmetic,
      promptVersion: M1_DENT_PROMPT_VERSION,
    };
  }
  return {
    hasDamage: true,
    part: object.part,
    type: object.type,
    severity: gated.severity,
    confidence,
    partMinor: gated.partMinor,
    labourMinor: gated.labourMinor,
    paintMinor: gated.paintMinor,
    repairCostMinor: gated.repairCostMinor,
    reasoning,
    cosmetic,
    promptVersion: M1_DENT_PROMPT_VERSION,
  };
};
