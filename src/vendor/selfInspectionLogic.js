/* eslint-disable */
// GENERATED - do not edit. The web (turag.ai) self-inspection logic, compiled
// by scripts/build-self-inspection-logic.mjs from @turag/web
// (src/app/inspect/[id]/* and @turag/core/pricing). Rebuild with that script.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/lib/inspection-display-names.ts
function buildItemLabelMap(items) {
  const map = /* @__PURE__ */ new Map();
  for (const it of items) {
    if (it.item_code && it.label && !map.has(it.item_code)) map.set(it.item_code, it.label);
  }
  return map;
}
function humanizeCode(code) {
  return code.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
function resolveItemDisplayName(itemCode, labels) {
  var _a;
  return (_a = labels == null ? void 0 : labels.get(itemCode)) != null ? _a : null;
}
var WALKAROUND_ANGLE_NAMES = {
  WALK_FRONT: "Front",
  WALK_FRONT_LEFT: "Front-left",
  WALK_LEFT: "Left",
  WALK_REAR_LEFT: "Rear-left",
  WALK_REAR: "Rear",
  WALK_REAR_RIGHT: "Rear-right",
  WALK_RIGHT: "Right",
  WALK_FRONT_RIGHT: "Front-right",
  // Exterior extras (on B1 with the walkaround)
  PANEL_FRONT_WINDSHIELD: "Front windshield",
  PANEL_REAR_WINDSHIELD: "Back windshield",
  PANEL_ROOF: "Roof",
  // Interior
  INT_DASHBOARD: "Dashboard",
  INT_STEERING: "Steering",
  INT_CLUSTER: "Clustermeter",
  INT_GEAR_KNOB: "Gear knob",
  INT_MUSIC_AC: "Music & AC controls",
  INT_REAR_SEAT: "Rear seat",
  INT_DICKY_INSIDE: "Dicky inside",
  INT_PEDALS: "Pedals",
  INT_RIGHT_FRONT_DOOR_CABIN: "Right front door cabin",
  INT_RIGHT_REAR_DOOR_CABIN: "Right rear door cabin",
  INT_RIGHT_FRONT_DOOR_OPEN: "Right front door open",
  INT_RIGHT_REAR_DOOR_OPEN: "Right rear door open",
  INT_LEFT_FRONT_DOOR_OPEN: "Left front door open",
  INT_LEFT_REAR_DOOR_OPEN: "Left rear door open",
  INT_DICKY_DOOR_OPEN: "Dicky door open",
  INT_DASHBOARD_VIDEO: "Dashboard video",
  // Engine
  ENG_BONNET_FRONT: "Engine & bonnet (front)",
  ENG_LEFT: "Engine left side",
  ENG_RIGHT: "Engine right side",
  ENG_LEFT_HINGE_APRON: "Engine left hinge & apron",
  ENG_RIGHT_HINGE_APRON: "Engine right hinge & apron",
  // Tyres
  WHEEL_RIGHT_FRONT_RIM: "Right front tyre rim",
  WHEEL_RIGHT_REAR_RIM: "Right rear tyre rim",
  WHEEL_LEFT_FRONT_RIM: "Left front tyre rim",
  WHEEL_LEFT_REAR_RIM: "Left rear tyre rim",
  TYRE_RIGHT_FRONT_TREAD: "Right front tyre tread",
  TYRE_RIGHT_REAR_TREAD: "Right rear tyre tread",
  TYRE_LEFT_FRONT_TREAD: "Left front tyre tread",
  TYRE_LEFT_REAR_TREAD: "Left rear tyre tread",
  WHEEL_SPARE: "Spare tyre",
  // Extras + underbody
  EXTRA_CAR_KEY: "Car key",
  UB_FRONT_LEFT: "Front left underbody",
  UB_REAR_RIGHT: "Rear right underbody",
  UB_REAR: "Rear underbody",
  // Dents / scratches (optional)
  DENT_1: "Dent / scratch 1",
  DENT_2: "Dent / scratch 2",
  DENT_3: "Dent / scratch 3",
  DENT_4: "Dent / scratch 4",
  DENT_5: "Dent / scratch 5",
  DENT_6: "Dent / scratch 6"
};
function resolveShotDisplayName(shotCode) {
  var _a;
  return (_a = WALKAROUND_ANGLE_NAMES[shotCode]) != null ? _a : humanizeCode(shotCode);
}
function evidenceNoun(kind) {
  if (kind === "DOCUMENT") return "document";
  if (kind === "PHOTO") return "photo";
  return "file";
}
function humanizeSubmitError(message, labels) {
  const withItems = message.replace(/\bItem ([A-Za-z0-9]+)\b/g, (_, code) => {
    const name2 = resolveItemDisplayName(code, labels);
    return name2 ? `The ${name2}` : "This item";
  });
  return withItems.replace(/angle\(s\): (.+)$/, (_, list) => {
    const ended = /\.\s*$/.test(list);
    const shots = list.split(",").map((s) => s.trim().replace(/\.+$/, "")).filter((s) => s.length > 0).map((s) => resolveShotDisplayName(s));
    return `angle(s): ${shots.join(", ")}${ended ? "." : ""}`;
  });
}

// src/app/inspect/[id]/self-inspection-steps.ts
var STEP_ORDER = ["photos", "documents", "checklist", "review"];
var DETAIL_ITEM_CODES = ["P1", "A1", "O1", "O2"];
function isDocumentItem(item) {
  var _a, _b;
  return (_b = (_a = item.evidence_requirement) == null ? void 0 : _a.kinds.includes("DOCUMENT")) != null ? _b : false;
}
function isEvidenceOnlyItem(item) {
  return item.evidence_only === true;
}
function isVideoItem(item) {
  const req = item.evidence_requirement;
  return !!req && req.kinds.includes("VIDEO") && !req.kinds.includes("DOCUMENT");
}
function isPhotoGridItem(item) {
  const req = item.evidence_requirement;
  if (!req || req.kinds.includes("DOCUMENT") || req.kinds.includes("VIDEO")) return false;
  return isEvidenceOnlyItem(item) ? req.shot_codes.length >= 1 : req.shot_codes.length > 1;
}
function partitionItems(items) {
  const details = [];
  for (const code of DETAIL_ITEM_CODES) {
    const it = items.find((i) => i.item_code === code);
    if (it) details.push(it);
  }
  const docs = items.filter(
    (i) => isDocumentItem(i) && !DETAIL_ITEM_CODES.includes(i.item_code)
  );
  const inDocs = new Set([...details, ...docs].map((i) => i.item_code));
  return {
    documents: [...details, ...docs],
    // Evidence-only photo/video items (Interior, Engine, Tyres, Extra, Dents, Dashboard video) have no
    // condition answer — they live in the Photos step, so they are excluded from the condition checklist.
    checklist: items.filter((i) => !inDocs.has(i.item_code) && !isEvidenceOnlyItem(i))
  };
}
var SHOT_LABELS = {
  WALK_FRONT: "Front",
  WALK_FRONT_LEFT: "Front-left corner",
  WALK_LEFT: "Left side",
  WALK_REAR_LEFT: "Rear-left corner",
  WALK_REAR: "Rear",
  WALK_REAR_RIGHT: "Rear-right corner",
  WALK_RIGHT: "Right side",
  WALK_FRONT_RIGHT: "Front-right corner",
  ENG_BATTERY: "Battery",
  ENG_OIL_CAP: "Oil filler cap"
};
function shotLabel(shotCode) {
  var _a;
  return (_a = SHOT_LABELS[shotCode]) != null ? _a : resolveShotDisplayName(shotCode);
}
function photoSlots(items) {
  var _a, _b, _c, _d;
  const slots = [];
  for (const it of items) {
    if (!isPhotoGridItem(it)) continue;
    const optional = ((_b = (_a = it.evidence_requirement) == null ? void 0 : _a.min_count) != null ? _b : 0) === 0;
    for (const shot of (_d = (_c = it.evidence_requirement) == null ? void 0 : _c.shot_codes) != null ? _d : []) {
      slots.push({ itemCode: it.item_code, shotCode: shot, label: shotLabel(shot), optional });
    }
  }
  return slots;
}
function photoGroups(items) {
  var _a, _b, _c, _d;
  const groups = [];
  for (const it of items) {
    if (!isPhotoGridItem(it)) continue;
    const minCount = (_b = (_a = it.evidence_requirement) == null ? void 0 : _a.min_count) != null ? _b : 0;
    const optional = minCount === 0;
    const slots = ((_d = (_c = it.evidence_requirement) == null ? void 0 : _c.shot_codes) != null ? _d : []).map((shot) => ({
      itemCode: it.item_code,
      shotCode: shot,
      label: shotLabel(shot),
      optional
    }));
    groups.push({ item: it, slots, minCount });
  }
  return groups;
}
var MODERATE_PLUS = /* @__PURE__ */ new Set(["MODERATE", "MAJOR", "CRITICAL"]);
function stepForItem(item, partition) {
  return partition.documents.some((d) => d.item_code === item.item_code) ? "documents" : "checklist";
}
function buildMissingList(input) {
  var _a, _b, _c;
  const { items, answers, evidenceCount, parseNumeric } = input;
  const partition = partitionItems(items);
  const has = (code) => items.some((i) => i.item_code === code);
  const saved = (code) => {
    var _a2;
    return ((_a2 = answers[code]) == null ? void 0 : _a2.saved) === true;
  };
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (e) => {
    var _a2;
    const key = `${(_a2 = e.itemCode) != null ? _a2 : ""}|${e.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(e);
  };
  if (has("P1") && !saved("P1")) push({ step: "documents", itemCode: "P1", label: "RC details" });
  if (has("A1") && !saved("A1"))
    push({ step: "documents", itemCode: "A1", label: "Chassis / VIN number" });
  for (const [code, label] of [
    ["O1", "Odometer reading"],
    ["O2", "Number of previous owners"]
  ]) {
    if (!has(code)) continue;
    const a = answers[code];
    const notAssessable = (a == null ? void 0 : a.severity) === "NOT_ASSESSABLE";
    if (!saved(code) || !notAssessable && parseNumeric(code, (_a = a == null ? void 0 : a.num) != null ? _a : "") == null)
      push({ step: "documents", itemCode: code, label });
  }
  for (const item of items) {
    if (isEvidenceOnlyItem(item)) {
      const req2 = item.evidence_requirement;
      if (req2 && item.mandatory && ((_b = evidenceCount[item.item_code]) != null ? _b : 0) < req2.min_count) {
        push({
          step: "photos",
          itemCode: item.item_code,
          label: isVideoItem(item) ? `Add the ${item.label.toLowerCase()}` : `Add photos for ${item.label}`
        });
      }
      continue;
    }
    const a = answers[item.item_code];
    const step = stepForItem(item, partition);
    if (item.mandatory && !saved(item.item_code)) {
      push({ step, itemCode: item.item_code, label: item.label });
      continue;
    }
    if (!(a == null ? void 0 : a.saved) || !a.severity || a.severity === "NOT_ASSESSABLE") continue;
    const req = item.evidence_requirement;
    if (req && ((_c = evidenceCount[item.item_code]) != null ? _c : 0) < req.min_count) {
      const docs = req.kinds.includes("DOCUMENT");
      push({
        step: docs ? "documents" : isPhotoGridItem(item) ? "photos" : step,
        itemCode: item.item_code,
        label: docs ? `Upload ${item.label}` : `Add a photo for ${item.label}`
      });
    }
    if ((req == null ? void 0 : req.severity_escalation) && MODERATE_PLUS.has(a.severity)) {
      const cost = Number(a.cost);
      if (!a.cost.trim() || !Number.isFinite(cost) || cost < 0)
        push({ step, itemCode: item.item_code, label: `Repair cost for ${item.label}` });
      if (a.severity === "CRITICAL" && !a.note.trim())
        push({ step, itemCode: item.item_code, label: `Note for ${item.label}` });
    }
  }
  return out;
}
function buildProgress(items, answers, uploadedShots) {
  var _a, _b, _c;
  const partition = partitionItems(items);
  let ptotal = 0;
  let pdone = 0;
  for (const it of items) {
    if (!isPhotoGridItem(it) && !isVideoItem(it)) continue;
    const min = (_b = (_a = it.evidence_requirement) == null ? void 0 : _a.min_count) != null ? _b : 0;
    if (min <= 0) continue;
    const have = ((_c = uploadedShots[it.item_code]) != null ? _c : []).length;
    ptotal += min;
    pdone += Math.min(have, min);
  }
  const photos = { done: pdone, total: ptotal };
  const savedCount = (list) => list.filter((i) => {
    var _a2;
    return (_a2 = answers[i.item_code]) == null ? void 0 : _a2.saved;
  }).length;
  const documents = { done: savedCount(partition.documents), total: partition.documents.length };
  const checklist = { done: savedCount(partition.checklist), total: partition.checklist.length };
  const total = photos.total + documents.total + checklist.total;
  const done = photos.done + documents.done + checklist.done;
  return { photos, documents, checklist, overall: total === 0 ? 0 : done / total };
}

// src/app/inspect/[id]/numeric-confirm.ts
var MAX_ODOMETER_KM = 9999999;
var MAX_OWNER_COUNT = 50;
function parseOdometerKm(raw) {
  if (raw == null) return null;
  const text = String(raw).toUpperCase().replace(/KM/g, "").replace(/,/g, "").trim();
  if (text === "") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > MAX_ODOMETER_KM) return null;
  return Math.floor(n);
}
function parseOwnerCount(raw) {
  if (raw == null) return null;
  const text = String(raw).replace(/,/g, "").trim();
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0 || n > MAX_OWNER_COUNT) return null;
  return n;
}

// src/app/inspect/[id]/damage-gate.ts
var DAMAGE_TYPE_VALUES = ["DENT", "SCRATCH", "CRACK", "RUST", "MISSING", "NONE"];
var VALID_SEVERITIES = ["NONE", "MINOR", "MODERATE", "MAJOR", "CRITICAL"];
function toSeverity(raw) {
  return VALID_SEVERITIES.includes(raw) ? raw : "NONE";
}
function normalizeDamageResult(raw) {
  if (!raw.hasDamage) {
    return {
      hasDamage: false,
      severity: "NONE",
      partMinor: 0,
      labourMinor: 0,
      paintMinor: 0,
      repairCostMinor: 0
    };
  }
  const partMinor = Math.max(0, Math.floor(raw.partMinor));
  const labourMinor = Math.max(0, Math.floor(raw.labourMinor));
  const paintMinor = Math.max(0, Math.floor(raw.paintMinor));
  return {
    hasDamage: true,
    severity: toSeverity(raw.severity),
    partMinor,
    labourMinor,
    paintMinor,
    repairCostMinor: partMinor + labourMinor + paintMinor
  };
}

// src/app/inspect/[id]/m1-prompts.ts
var M1_DENT_PROMPT_VERSION = "m1-dent-v4";

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message == null ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message != null ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message != null ? message : required_error) != null ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message != null ? message : invalid_type_error) != null ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params == null ? void 0 : params.async) != null ? _a : false,
        contextualErrorMap: params == null ? void 0 : params.errorMap
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err == null ? void 0 : err.message) == null ? void 0 : _a.toLowerCase()) == null ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params == null ? void 0 : params.errorMap,
        async: true
      },
      path: (params == null ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && (decoded == null ? void 0 : decoded.typ) !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      offset: (_a = options == null ? void 0 : options.offset) != null ? _a : false,
      local: (_b = options == null ? void 0 : options.local) != null ? _b : false,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options == null ? void 0 : options.position,
      ...errorUtil.errToObj(options == null ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params == null ? void 0 : params.coerce) != null ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params == null ? void 0 : params.coerce) != null ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params == null ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params == null ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) == null ? void 0 : _b.call(_a, issue, ctx).message) != null ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) != null ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          var _a2, _b2;
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = (_b2 = (_a2 = params.fatal) != null ? _a2 : fatal) != null ? _b2 : true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = (_b = (_a = params.fatal) != null ? _a : fatal) != null ? _b : true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// ../../packages/contracts/src/error-model.ts
var errorResponse = external_exports.object({
  error: external_exports.object({
    code: external_exports.string(),
    message: external_exports.string(),
    details: external_exports.record(external_exports.unknown()).optional(),
    request_id: external_exports.string()
  })
});

// ../../packages/contracts/src/vehicles.ts
var fuel = external_exports.enum(["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"]);
var identifyVehicleRequest = external_exports.union([
  external_exports.object({ registration_number: external_exports.string().min(1).max(20) }),
  external_exports.object({
    make: external_exports.string().min(1).max(60),
    model: external_exports.string().min(1).max(60),
    fuel: fuel.optional(),
    year: external_exports.number().int().min(1980).max(2100).optional(),
    /** Needed only when the model has no catalogue match (fallback create). */
    category: external_exports.enum(["PASSENGER", "TWO_WHEELER"]).optional()
  })
]);
var variantCandidate = external_exports.object({
  id: external_exports.string(),
  variant: external_exports.string(),
  fuel: external_exports.string(),
  reference_year: external_exports.number().int()
});
var identifyVehicleResponse = external_exports.object({
  vehicle_id: external_exports.string(),
  category: external_exports.string(),
  make: external_exports.string(),
  model: external_exports.string(),
  variant_id: external_exports.string().nullable(),
  variant_candidates: external_exports.array(variantCandidate),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  lookup_source: external_exports.enum(["STUB", "RTO", "MANUAL"]),
  request_id: external_exports.string()
});
var registrySnapshotFacts = external_exports.object({
  engine_cc: external_exports.number().int().nullable(),
  seat_capacity: external_exports.number().int().nullable(),
  body_type: external_exports.string().nullable(),
  color: external_exports.string().nullable(),
  rc_city: external_exports.string().nullable(),
  rc_state: external_exports.string().nullable(),
  rc_status: external_exports.string().nullable(),
  insurance_company: external_exports.string().nullable(),
  insurance_upto: external_exports.string().nullable(),
  fit_upto: external_exports.string().nullable(),
  tax_upto: external_exports.string().nullable(),
  pucc_upto: external_exports.string().nullable(),
  financed: external_exports.string().nullable(),
  owner_count: external_exports.number().int().nullable(),
  mfg_month: external_exports.number().int().nullable(),
  registration_date: external_exports.string().nullable(),
  norms_type: external_exports.string().nullable(),
  vehicle_category_description: external_exports.string().nullable(),
  vehicle_gross_weight: external_exports.number().int().nullable(),
  no_cylinders: external_exports.number().int().nullable(),
  unladen_weight: external_exports.number().int().nullable(),
  sleeper_capacity: external_exports.number().int().nullable(),
  standing_capacity: external_exports.number().int().nullable(),
  wheelbase: external_exports.string().nullable(),
  pucc_number: external_exports.string().nullable(),
  permit_number: external_exports.string().nullable(),
  permit_issue_date: external_exports.string().nullable(),
  permit_valid_from: external_exports.string().nullable(),
  permit_valid_upto: external_exports.string().nullable(),
  permit_type: external_exports.string().nullable(),
  national_permit_number: external_exports.string().nullable(),
  national_permit_upto: external_exports.string().nullable(),
  national_permit_issued_by: external_exports.string().nullable(),
  non_use_status: external_exports.string().nullable(),
  non_use_from: external_exports.string().nullable(),
  non_use_to: external_exports.string().nullable(),
  blacklist_status: external_exports.string().nullable(),
  noc_details: external_exports.string().nullable(),
  rto_code: external_exports.string().nullable(),
  has_vin_baseline: external_exports.boolean(),
  has_engine_baseline: external_exports.boolean()
});
var proposeVehicleRequest = external_exports.object({
  registration_number: external_exports.string().min(1).max(20)
});
var proposeVehicleResponse = external_exports.object({
  category: external_exports.string(),
  make: external_exports.string(),
  model: external_exports.string(),
  variant_text: external_exports.string().nullable(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  lookup_source: external_exports.enum(["STUB", "RTO", "MANUAL"]),
  /** True when served from a valid DB snapshot (no Surepass call happened). */
  from_cache: external_exports.boolean(),
  registry: registrySnapshotFacts,
  request_id: external_exports.string()
});
var confirmVehicleRequest = external_exports.object({
  registration_number: external_exports.string().min(1).max(20)
});
var confirmVehicleResponse = external_exports.object({
  vehicle_id: external_exports.string(),
  category: external_exports.string(),
  make: external_exports.string(),
  model: external_exports.string(),
  variant_id: external_exports.string().nullable(),
  variant_candidates: external_exports.array(variantCandidate),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  lookup_source: external_exports.enum(["STUB", "RTO", "MANUAL"]),
  /** True when an existing valid snapshot was reused (no Surepass call happened). */
  from_cache: external_exports.boolean(),
  registry: registrySnapshotFacts,
  request_id: external_exports.string()
});

// ../../packages/contracts/src/valuations.ts
var estimateValuationRequest = external_exports.object({
  vehicle_id: external_exports.string().min(1),
  stage: external_exports.enum(["INSTANT", "DECLARED"]),
  odometer_km: external_exports.number().int().min(0).max(1e6).optional(),
  owner_count: external_exports.number().int().min(1).max(20).optional(),
  declared_condition: external_exports.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  /**
   * Optional inspection scoping: the server reads that inspection's recorded
   * answers + evidence + kept findings into the LLM context. Requires Bearer
   * auth (owner/inspector/ops); the reader enforces access. Additive —
   * existing vehicle-only callers are unaffected.
   */
  inspection_id: external_exports.string().min(1).optional()
});
var band = external_exports.object({ low: external_exports.number(), high: external_exports.number() });
var aiEstimateDetail = external_exports.object({
  pass_index: external_exports.number(),
  value_minor: external_exports.number(),
  confidence: external_exports.number().nullable(),
  key_evidence: external_exports.array(external_exports.string()),
  positive_factors: external_exports.array(external_exports.string()),
  negative_factors: external_exports.array(external_exports.string()),
  rationale: external_exports.string()
});
var reviewSummary = external_exports.object({
  verdict: external_exports.enum(["REASONABLE", "OVERVALUED", "UNDERVALUED", "ABSTAIN"]),
  cited_evidence: external_exports.array(external_exports.string()),
  rationale: external_exports.string().nullable()
});
var finalEstimatedValue = external_exports.object({
  value_minor: external_exports.number(),
  individual_estimates_minor: external_exports.array(external_exports.number()),
  valid_count: external_exports.number(),
  ignored_count: external_exports.number(),
  model_version: external_exports.string(),
  aggregation_method: external_exports.string().optional(),
  estimates: external_exports.array(aiEstimateDetail).optional(),
  run_id: external_exports.string().optional(),
  evidence_status: external_exports.enum(["NONE", "INSUFFICIENT", "ANCHORED"]).optional(),
  review: reviewSummary.nullable().optional()
});
var valuationOutput = external_exports.object({
  valuation_id: external_exports.string(),
  vehicle_id: external_exports.string(),
  stage: external_exports.string(),
  currency: external_exports.literal("INR"),
  /** New-car ex-showroom reference (display context for the CONDITION step). Null when unmatched. */
  base_ex_showroom: external_exports.number().nullable(),
  bands: external_exports.object({ distress: band, auction: band, trade_in: band, retail: band }),
  headline: external_exports.object({ value: external_exports.number(), band: external_exports.string() }),
  confidence: external_exports.object({ level: external_exports.string(), score: external_exports.number(), basis: external_exports.string() }),
  coverage_pct: external_exports.number().nullable(),
  grade: external_exports.string().nullable(),
  adjustments: external_exports.array(
    external_exports.object({ factor: external_exports.string(), impact_pct: external_exports.number(), detail: external_exports.string().optional() })
  ),
  comparables: external_exports.array(external_exports.unknown()),
  flags: external_exports.array(external_exports.string()),
  model_version: external_exports.string(),
  valid_until: external_exports.string(),
  final_estimated_value: finalEstimatedValue.optional()
});
var estimateValuationResponse = external_exports.discriminatedUnion("status", [
  external_exports.object({ status: external_exports.literal("READY"), valuation: valuationOutput, request_id: external_exports.string() }),
  external_exports.object({ status: external_exports.literal("NOT_READY"), reason: external_exports.string(), request_id: external_exports.string() })
]);

// ../../packages/contracts/src/inspections.ts
var inspectionMode = external_exports.enum(["M1", "M2", "M3", "M4", "M5"]);
var inspectionStatus = external_exports.enum([
  "BOOKED",
  "ASSIGNED",
  "EN_ROUTE",
  "INSPECTING",
  "REPORT_READY",
  "CANCELLED"
]);
var inspectionSlot = external_exports.object({
  id: external_exports.string(),
  start_at: external_exports.string(),
  // ISO
  end_at: external_exports.string(),
  label: external_exports.string()
  // e.g. "Tomorrow, 4–6 PM"
});
var inspector = external_exports.object({
  id: external_exports.string(),
  name: external_exports.string(),
  photo_url: external_exports.string().nullable(),
  verified_id: external_exports.boolean(),
  rating: external_exports.number(),
  // 0–5
  jobs_count: external_exports.number().int(),
  phone_masked: external_exports.string()
  // e.g. "+91 ••••• ••210"
});
var slotsResponse = external_exports.object({
  slots: external_exports.array(inspectionSlot),
  is_sample: external_exports.boolean()
});
var sampleBookingResponse = external_exports.object({
  inspection_id: external_exports.string(),
  status: inspectionStatus,
  slot: inspectionSlot,
  mode: inspectionMode,
  is_sample: external_exports.boolean()
});
var statusEvent = external_exports.object({
  status: inspectionStatus,
  at: external_exports.string(),
  // ISO
  note: external_exports.string().optional()
});
var inspectionTracking = external_exports.object({
  inspection_id: external_exports.string(),
  current: inspectionStatus,
  inspector: inspector.nullable(),
  eta_minutes: external_exports.number().nullable(),
  timeline: external_exports.array(statusEvent),
  is_sample: external_exports.boolean()
});

// ../../packages/contracts/src/reports.ts
var grade = external_exports.enum(["A_PLUS", "A", "B", "C", "D", "E"]);
var severity = external_exports.enum(["OK", "MINOR", "MODERATE", "MAJOR", "CRITICAL", "NOT_ASSESSABLE"]);
var band2 = external_exports.object({ low: external_exports.number(), high: external_exports.number() });
var reportFinding = external_exports.object({
  item_code: external_exports.string(),
  group: external_exports.string(),
  label: external_exports.string(),
  severity,
  note: external_exports.string().optional(),
  rectification_cost_minor: external_exports.number().nullable(),
  photo_ref: external_exports.string().nullable()
});
var reportMedia = external_exports.object({
  id: external_exports.string(),
  group: external_exports.string(),
  caption: external_exports.string(),
  /** A placeholder representation (CSS/blurhash/data-URI) — sample reports carry no real evidence. */
  placeholder: external_exports.string(),
  url: external_exports.string().nullable()
});
var documentStatus = external_exports.object({
  doc_type: external_exports.string(),
  // RC / Insurance / PUC / Hypothecation
  status: external_exports.enum(["PRESENT", "EXPIRED", "MISSING", "FLAGGED"]),
  detail: external_exports.string().optional()
});
var verification = external_exports.object({
  certificate_id: external_exports.string(),
  // mono, e.g. TRG-INSP-SAMPLE-0001
  verify_url: external_exports.string(),
  valid_until: external_exports.string(),
  // ISO
  /** SAMPLE until a real inspection + QC backend exists — never render this as "Turag Verified". */
  state: external_exports.enum(["SAMPLE", "VERIFIED", "EXPIRED", "DISPUTED"])
});
var report = external_exports.object({
  report_id: external_exports.string(),
  vehicle_id: external_exports.string(),
  vehicle_label: external_exports.string(),
  mode: inspectionMode,
  grade,
  score: external_exports.number(),
  // 0–100
  coverage_pct: external_exports.number(),
  // assessment coverage (honesty: 92/100 on 96% ≠ on 60%)
  bands: external_exports.object({ distress: band2, auction: band2, trade_in: band2, retail: band2 }),
  headline: external_exports.object({ value: external_exports.number(), band: external_exports.string() }),
  confidence: external_exports.object({ level: external_exports.string(), score: external_exports.number(), basis: external_exports.string() }),
  findings: external_exports.array(reportFinding),
  media: external_exports.array(reportMedia),
  documents: external_exports.array(documentStatus),
  inspector: inspector.nullable(),
  verification,
  /** Borrower / previous-owner PII is masked by default (DPDP). */
  seller_masked: external_exports.object({ name_masked: external_exports.string(), location: external_exports.string() }),
  disclaimer: external_exports.string(),
  generated_at: external_exports.string(),
  is_sample: external_exports.boolean()
});

// ../../packages/contracts/src/auth.ts
var phone = external_exports.string().trim().min(8).max(20).regex(/^\+?[0-9\s-]+$/, "Enter a valid phone number.");
var otpCode = external_exports.string().trim().regex(/^[0-9]{4,8}$/, "Enter the code from your SMS.");
var otpStartRequest = external_exports.object({ phone });
var otpStartResponse = external_exports.object({
  otp_token: external_exports.string(),
  expires_in: external_exports.number().int().positive(),
  resend_after: external_exports.number().int().nonnegative(),
  request_id: external_exports.string(),
  /** Dev/staging only: DevOtpProvider surfaces the code so testers can complete the flow. Never set in production. */
  dev_hint: external_exports.string().optional()
});
var otpVerifyRequest = external_exports.object({
  otp_token: external_exports.string().min(1),
  code: otpCode,
  /** Age gate (FR-IDN-005 / §8.3): a minor's data is not processed. */
  age_confirmed: external_exports.boolean()
});
var passwordLoginRequest = external_exports.object({
  email: external_exports.string().trim().min(3).max(254),
  password: external_exports.string().min(1).max(200)
});
var userSummary = external_exports.object({
  id: external_exports.string(),
  phone_masked: external_exports.string(),
  name: external_exports.string().nullable(),
  /** The user's OWN email (shown only in their own summary), or null. A second passwordless login identifier. */
  email: external_exports.string().nullable(),
  /** Whether that email is verified (via email OTP) and therefore usable to log in. */
  email_verified: external_exports.boolean(),
  /** URL to the user's OWN profile photo (authenticated serving route), or null → initials monogram. */
  avatar_url: external_exports.string().nullable(),
  roles: external_exports.array(external_exports.string())
});
var authSession = external_exports.object({
  access_token: external_exports.string(),
  /**
   * The refresh token. For the web client this is delivered as an httpOnly `tg_refresh` cookie
   * (XSS-resistant) and therefore OMITTED from the body — hence optional. A non-browser caller may
   * still receive it here. The web never reads or stores it (see docs/api/authentication.md §7).
   */
  refresh_token: external_exports.string().optional(),
  expires_in: external_exports.number().int().positive(),
  user: userSummary,
  /** True when the user still owes ACCOUNT_TERMS/PRIVACY_POLICY consent before they can persist. */
  consent_required: external_exports.boolean(),
  request_id: external_exports.string()
});
var socialSignInRequest = external_exports.object({ supabase_access_token: external_exports.string().min(1) });
var socialSignInResponse = external_exports.discriminatedUnion("status", [
  external_exports.object({
    status: external_exports.literal("SESSION"),
    access_token: external_exports.string(),
    refresh_token: external_exports.string().optional(),
    expires_in: external_exports.number().int().positive(),
    user: userSummary,
    consent_required: external_exports.boolean(),
    request_id: external_exports.string()
  }),
  external_exports.object({
    status: external_exports.literal("NEEDS_PHONE"),
    name: external_exports.string().nullable(),
    email: external_exports.string(),
    request_id: external_exports.string()
  })
]);
var socialLinkRequest = external_exports.object({ supabase_access_token: external_exports.string().min(1) });
var socialLinkResponse = external_exports.object({ linked: external_exports.boolean(), request_id: external_exports.string() });
var refreshRequest = external_exports.object({ refresh_token: external_exports.string().min(1).optional() });
var refreshResponse = external_exports.object({
  access_token: external_exports.string(),
  /** Rotated refresh token — omitted for the web (rotated via the httpOnly cookie). */
  refresh_token: external_exports.string().optional(),
  expires_in: external_exports.number().int().positive(),
  request_id: external_exports.string()
});
var logoutRequest = external_exports.object({ refresh_token: external_exports.string().min(1).optional() });
var consentSummaryItem = external_exports.object({
  purpose: external_exports.string(),
  granted: external_exports.boolean(),
  policy_version: external_exports.string().nullable()
});
var meResponse = external_exports.object({
  user: userSummary,
  /** Account creation time (ISO 8601) — the profile "member since". A /me-only enrichment, deliberately
   *  kept out of the identity-only `userSummary` embedded in auth-token responses (PII minimisation, §32). */
  member_since: external_exports.string(),
  consents_summary: external_exports.array(consentSummaryItem),
  request_id: external_exports.string()
});
var updateMeRequest = external_exports.object({
  name: external_exports.string().trim().min(1, "Enter your name.").max(80, "Name is too long.")
});
var email = external_exports.string().trim().min(3).max(254);
var emailVerifyStartRequest = external_exports.object({ email });
var emailVerifyStartResponse = external_exports.object({
  /** Whether a verification email was actually dispatched (false in dev, where `dev_link` is returned instead). */
  sent: external_exports.boolean(),
  expires_in: external_exports.number().int().positive(),
  resend_after: external_exports.number().int().nonnegative(),
  request_id: external_exports.string(),
  /** Dev/staging only: the callback link, surfaced when no Supabase provider is wired so testers can click it. */
  dev_link: external_exports.string().optional()
});
var emailConfirmRequest = external_exports.object({ state: external_exports.string().min(1) });
var emailConfirmResponse = external_exports.object({
  verified: external_exports.boolean(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/consent.ts
var CONSENT_PURPOSES = ["ACCOUNT_TERMS", "PRIVACY_POLICY", "MARKETING"];
var consentPurpose = external_exports.enum(CONSENT_PURPOSES);
var recordConsentRequest = external_exports.object({
  accept_terms: external_exports.boolean(),
  accept_privacy: external_exports.boolean(),
  marketing: external_exports.boolean().optional()
});
var recordConsentResponse = external_exports.object({
  consents_summary: external_exports.array(consentSummaryItem),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/notifications.ts
var notificationItem = external_exports.object({
  id: external_exports.string(),
  type: external_exports.string(),
  title: external_exports.string(),
  body: external_exports.string(),
  link: external_exports.string().nullable(),
  read: external_exports.boolean(),
  created_at: external_exports.string()
});
var notificationsResponse = external_exports.object({
  items: external_exports.array(notificationItem),
  unread_count: external_exports.number().int().nonnegative(),
  request_id: external_exports.string()
});
var markNotificationsReadResponse = external_exports.object({
  marked: external_exports.number().int().nonnegative(),
  request_id: external_exports.string()
});
var devicePlatform = external_exports.enum(["android", "ios"]);
var registerDeviceRequest = external_exports.object({
  token: external_exports.string().min(1).max(4096),
  platform: devicePlatform
});
var registerDeviceResponse = external_exports.object({
  registered: external_exports.literal(true),
  request_id: external_exports.string()
});
var unregisterDeviceRequest = external_exports.object({
  token: external_exports.string().min(1).max(4096)
});
var unregisterDeviceResponse = external_exports.object({
  unregistered: external_exports.boolean(),
  request_id: external_exports.string()
});
var subscribeWebPushRequest = external_exports.object({
  endpoint: external_exports.string().url().max(2048),
  keys: external_exports.object({
    p256dh: external_exports.string().min(1).max(512),
    auth: external_exports.string().min(1).max(512)
  })
});
var subscribeWebPushResponse = external_exports.object({
  subscribed: external_exports.literal(true),
  request_id: external_exports.string()
});
var unsubscribeWebPushRequest = external_exports.object({
  endpoint: external_exports.string().url().max(2048)
});
var unsubscribeWebPushResponse = external_exports.object({
  unsubscribed: external_exports.boolean(),
  request_id: external_exports.string()
});
var testWebPushResponse = external_exports.object({
  sent: external_exports.number().int().nonnegative(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/saved-vehicles.ts
var saveVehicleRequest = external_exports.object({
  vehicle_id: external_exports.string().min(1),
  valuation_id: external_exports.string().min(1).optional()
});
var savedVehicleView = external_exports.object({
  id: external_exports.string(),
  vehicle_id: external_exports.string(),
  valuation_id: external_exports.string().nullable(),
  inspection_id: external_exports.string().nullable().optional(),
  inspection_status: external_exports.string().nullable().optional(),
  /** The latest inspection's mode (e.g. 'M1' self-inspection, 'M2'+ inspector) — lets the garage route a
   *  resumable self-inspection to the self-capture screen and never offer to "continue" an inspector job. */
  inspection_mode: external_exports.string().nullable().optional(),
  /** ADR-0038: the vehicle has a report-ready inspection (self or inspector) → it may be listed. When false
   *  the garage offers "Self-inspect now" / "Book an inspector" instead of "List this vehicle". */
  inspection_eligible: external_exports.boolean().optional(),
  /** The vehicle's active listing (PENDING_REVIEW/LIVE), if any — so the garage can disable "List this
   *  vehicle" and link to the existing listing instead. Null when the vehicle isn't currently listed. */
  listing_id: external_exports.string().nullable().optional(),
  listing_status: external_exports.string().nullable().optional(),
  vehicle: external_exports.object({
    make: external_exports.string(),
    model: external_exports.string(),
    mfg_year: external_exports.number().int(),
    fuel: external_exports.string(),
    category: external_exports.string()
  }).nullable(),
  /** Headline valuation figure (integer paise) + band, when a valuation was linked. No PII. */
  headline: external_exports.object({ value: external_exports.number(), band: external_exports.string() }).nullable(),
  created_at: external_exports.string()
});
var saveVehicleResponse = external_exports.object({
  saved_vehicle: savedVehicleView,
  request_id: external_exports.string()
});
var listSavedVehiclesResponse = external_exports.object({
  items: external_exports.array(savedVehicleView),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/checklist.ts
var inspectionCategory = external_exports.enum(["PASSENGER", "TWO_WHEELER"]);
var naReason = external_exports.enum([
  "VEHICLE_STATIC",
  "NO_KEY",
  "NO_BATTERY",
  "ACCESS_BLOCKED",
  "OWNER_REFUSED",
  "UNSAFE",
  "TOOL_UNAVAILABLE",
  "PART_MISSING",
  "WEATHER",
  "TIME_CONSTRAINT"
]);
var gradeCapReason = external_exports.enum([
  "PILLAR_CUT",
  "CHASSIS_MISMATCH",
  "FLOOD",
  "ODOMETER_TAMPER",
  "THEFT_FLAG",
  "STRUCTURAL_WELD",
  "AIRBAG_MISSING"
]);
var evidenceKind = external_exports.enum(["PHOTO", "VIDEO", "AUDIO", "DOCUMENT", "MEASUREMENT"]);
var answerType = external_exports.enum(["STATE", "NUMERIC", "BOOL"]);
var shotCategory = external_exports.enum([
  "EXTERIOR",
  "INTERIOR",
  "ENGINE",
  "TYRE",
  "IDENTITY",
  "UNDERBODY",
  "DOCUMENT",
  // Catch-all tab for optional supplementary photos (sunroof, infotainment, accessories) that are not a
  // scored inspection group — surfaced as the "Extras" gallery tab (§6.2 blocks → category tabs).
  "EXTRAS"
]);
var shotSpec = external_exports.object({
  shot_code: external_exports.string().min(1),
  label: external_exports.string().min(1),
  block: external_exports.string().min(1),
  category: shotCategory,
  order: external_exports.number().int().nonnegative(),
  min_count: external_exports.number().int().min(1).default(1),
  mandatory: external_exports.boolean().default(true),
  flash_forced: external_exports.boolean().default(false),
  na_escapable: external_exports.boolean().default(true),
  gallery_allowed: external_exports.boolean().default(false),
  silhouette: external_exports.string().nullable().default(null),
  constrained_alt_of: external_exports.string().nullable().default(null)
});
var evidenceRequirement = external_exports.object({
  kinds: external_exports.array(evidenceKind).min(1),
  min_count: external_exports.number().int().min(0),
  /**
   * v1 advisory shot hints (retained for pinned historical rows). Superseded by `shots` in schema_version
   * 2, which models each shot as a first-class, enforced unit. When `shots` is present it is authoritative.
   */
  shot_codes: external_exports.array(external_exports.string()).default([]),
  /** schema_version 2 — the enforced per-shot matrix for this item (spec §6.2). */
  shots: external_exports.array(shotSpec).optional(),
  /** When true, MODERATE+ requires a cost estimate and CRITICAL requires a note (severity escalation). */
  severity_escalation: external_exports.boolean().default(false)
});
var checklistItemSpec = external_exports.object({
  item_code: external_exports.string().min(1),
  label: external_exports.string().min(1),
  group_code: external_exports.string().min(1),
  answer_type: answerType.default("STATE"),
  applicable_modes: external_exports.array(inspectionMode).min(1),
  /** Gate items are recorded but not scored (identity/legal gates). */
  gate: external_exports.boolean().default(false),
  scored: external_exports.boolean().default(true),
  mandatory: external_exports.boolean().default(false),
  /**
   * The item has NO condition answer — it is a pure evidence (photo/video) slot captured through the
   * per-item upload grid (spec §6.2 guided photos). Unlike the document gate items (which record a
   * present/not-possible claim as their answer and need evidence only once answered), an evidence-only
   * item is never answered: the submit gate enforces its `evidence_requirement.min_count` directly when
   * it is mandatory, and the capture UI renders it as tiles with no severity choice. Additive, default
   * false — existing items (answered gates, scored items) are unaffected. Optional (not defaulted) so the
   * published type stays additive and existing item literals/fixtures keep type-checking.
   */
  evidence_only: external_exports.boolean().optional(),
  /**
   * The item requires the vehicle to be OPERATIONAL to assess (cold-start, idle, OBD scan, live HVAC,
   * under-load electricals…). Spec §4.3 mandates this distinction live "into the item schema from the
   * first migration": in an M3 (yard/static) inspection a `dynamic` item that was not positively
   * answered resolves deterministically to NOT_ASSESSABLE / VEHICLE_STATIC (a recorded coverage gap),
   * so a repossessed, non-starting vehicle is scored fairly over what could actually be assessed —
   * rather than the flag being inferred from item codes in code (business logic belongs in versioned
   * config, not code — CLAUDE.md §11). Additive, default false; existing published configs still parse.
   */
  dynamic: external_exports.boolean().default(false),
  evidence_requirement: evidenceRequirement.optional(),
  grade_cap: external_exports.object({ reason: gradeCapReason }).optional()
});
var checklistSection = external_exports.object({
  group_code: external_exports.string().min(1),
  label: external_exports.string().min(1),
  items: external_exports.array(checklistItemSpec).min(1)
});
var checklistDefinition = external_exports.object({
  // v1 = advisory shot_codes; v2 = first-class enforced `shots` (§6.2). Pinned historical rows may be
  // either — both parse, so a past grade stays reproducible.
  schema_version: external_exports.union([external_exports.literal(1), external_exports.literal(2)]),
  category: inspectionCategory,
  applicable_modes: external_exports.array(inspectionMode).min(1),
  sections: external_exports.array(checklistSection).min(1),
  required_documents: external_exports.array(external_exports.string()).default([])
});
var getChecklistResponse = external_exports.object({
  checklist: checklistDefinition,
  checklist_version: external_exports.number().int().nonnegative(),
  request_id: external_exports.string()
});
var scoringConfig = external_exports.object({
  schema_version: external_exports.literal(1),
  category: inspectionCategory,
  state_scores: external_exports.object({ OK: external_exports.number(), MINOR: external_exports.number(), MODERATE: external_exports.number(), MAJOR: external_exports.number(), CRITICAL: external_exports.number() }),
  group_weights: external_exports.record(external_exports.string(), external_exports.number().min(0)),
  na_policy: external_exports.literal("EXCLUDE_FROM_DENOMINATOR"),
  grade_bands: external_exports.array(external_exports.object({ grade, min: external_exports.number().min(0).max(100) })).min(1),
  /** Coverage % required for "Turag Verified" (config, set with counsel — OQ-209). */
  verified_threshold: external_exports.number().int().min(0).max(100)
});

// ../../packages/contracts/src/capture-plan.ts
var shotStatus = external_exports.enum(["PENDING", "CAPTURED", "NOT_POSSIBLE", "QC_FLAGGED"]);
var captureGateConfig = external_exports.object({
  /** Laplacian-variance blur floor; a frame below this is "too blurry". */
  blur_laplacian_min: external_exports.number().nonnegative(),
  /** Fraction of pixels allowed at the dark/bright ends before under/over-exposure is flagged (0–1). */
  exposure_low_max: external_exports.number().min(0).max(1),
  exposure_high_min: external_exports.number().min(0).max(1),
  /** Max fraction of near-white specular pixels before glare is flagged (0–1). */
  glare_max_frac: external_exports.number().min(0).max(1),
  /** Min fraction of the frame the subject must occupy (0–1) — the §6.1.3 "occupies a minimum share". */
  min_frame_fill_frac: external_exports.number().min(0).max(1),
  /** Max absolute horizon tilt, degrees (§6.1.3 horizon/tilt check). */
  max_tilt_deg: external_exports.number().min(0).max(90),
  /** §6.1.4 retake budget: automatic retakes before the frame is accepted and flagged for QC. */
  retake_budget: external_exports.number().int().min(0)
});
var shotPlanItem = external_exports.object({
  shot_code: external_exports.string(),
  item_code: external_exports.string(),
  label: external_exports.string(),
  block: external_exports.string(),
  category: shotCategory,
  kind: evidenceKind,
  order: external_exports.number().int(),
  mandatory: external_exports.boolean(),
  min_count: external_exports.number().int(),
  flash_forced: external_exports.boolean(),
  na_escapable: external_exports.boolean(),
  /** True only for DOCUMENT shots (§6.1.1 — condition media is camera-native, gallery disabled). */
  gallery_allowed: external_exports.boolean(),
  silhouette: external_exports.string().nullable(),
  /** When set, this is a §9.3 constrained-space alternate for the named shot. */
  constrained_alt_of: external_exports.string().nullable(),
  status: shotStatus,
  captured_count: external_exports.number().int().nonnegative(),
  na_reason: external_exports.string().nullable()
});
var capturePlanResponse = external_exports.object({
  inspection_id: external_exports.string(),
  category: inspectionCategory,
  mode: inspectionMode,
  /** Pinned at inspection creation → the plan is reproducible for a historical inspection. */
  checklist_version: external_exports.number().int().nonnegative(),
  gate_config_version: external_exports.number().int().nonnegative(),
  gate_config: captureGateConfig,
  shots: external_exports.array(shotPlanItem),
  summary: external_exports.object({
    total_mandatory: external_exports.number().int().nonnegative(),
    captured: external_exports.number().int().nonnegative(),
    not_possible: external_exports.number().int().nonnegative(),
    pending: external_exports.number().int().nonnegative(),
    /** Mirrors the server's per-shot assertSubmittable — the client cannot fake submit-readiness. */
    submittable: external_exports.boolean()
  }),
  request_id: external_exports.string()
});
var markShotNotPossibleRequest = external_exports.object({
  na_reason: external_exports.string().min(1),
  note: external_exports.string().max(500).optional()
});

// ../../packages/contracts/src/inspection-engine.ts
var inspectionEngineStatus = external_exports.enum([
  "DRAFT",
  "IN_PROGRESS",
  "SUBMITTED",
  "INTEGRITY_FAILED",
  "PENDING_QC",
  "QC_REJECTED",
  "VERIFIED",
  "VALUED",
  "PUBLISHED",
  "DISPUTED",
  "RE_INSPECTION",
  "EXPIRED",
  "ABANDONED",
  "BLOCKED"
]);
var qcStatus = external_exports.enum(["PASS", "REJECT"]);
var createInspectionRequest = external_exports.object({
  vehicle_id: external_exports.string().min(1),
  mode: inspectionMode,
  category: inspectionCategory,
  /** OQ-211 (doorstep): the inspector's assigned booking this inspection fulfils. */
  booking_id: external_exports.string().min(1).optional(),
  /**
   * DPDP inspection consent (Privacy Policy §6.4): the person's explicit consent to the inspection and its
   * evidence capture. Required for a consumer self-inspection (mode M1); for inspector-fulfilled inspections
   * (M2–M5) the consent was already captured at booking time, so it is not resent here. Enforced at the route
   * and recorded in the audit log as evidence.
   */
  inspection_consent: external_exports.boolean().optional()
});
var mlSuggestionDecision = external_exports.enum(["CONFIRMED", "OVERRIDDEN", "REJECTED"]);
var mlSuggestion = external_exports.object({
  engine_version: external_exports.string().min(1).max(40),
  analyzed_at: external_exports.string().min(1),
  media_id: external_exports.string().min(1).max(40).nullable(),
  shot_code: external_exports.string().min(1).max(40).nullable(),
  part: external_exports.string().max(40).nullable(),
  damage_type: external_exports.string().max(20).nullable(),
  severity: external_exports.string().max(20).nullable(),
  confidence: external_exports.number().min(0).max(1).nullable(),
  repair_cost_minor: external_exports.number().int().min(0).nullable(),
  decision: mlSuggestionDecision,
  decided_at: external_exports.string().min(1)
});
var recordResponseRequest = external_exports.object({
  severity,
  numeric_value: external_exports.number().optional(),
  unit: external_exports.string().optional(),
  text_note: external_exports.string().optional(),
  na_reason: naReason.optional(),
  refurb_cost_minor: external_exports.number().int().min(0).optional(),
  inspector_override: external_exports.boolean().optional(),
  ml_suggestion: mlSuggestion.nullable().optional()
});
var registerEvidenceRequest = external_exports.object({
  item_code: external_exports.string().min(1),
  shot_code: external_exports.string().min(1),
  kind: evidenceKind,
  captured_at: external_exports.string().optional(),
  // ISO
  gps: external_exports.object({ lat: external_exports.number(), lng: external_exports.number(), accuracy_m: external_exports.number().optional() }).optional(),
  /** Client-generated id for idempotent registration (mirrors the future upload idempotency). */
  client_asset_id: external_exports.string().min(1)
});
var qcReviewRequest = external_exports.object({
  decision: qcStatus,
  sampled_reason: external_exports.string().optional(),
  itemised_corrections: external_exports.array(external_exports.object({ item_code: external_exports.string(), note: external_exports.string() })).optional(),
  reason: external_exports.string().optional()
});
var disputeInspectionRequest = external_exports.object({
  reason: external_exports.string().trim().min(1).max(500)
});
var inspectionItemView = external_exports.object({
  item_code: external_exports.string(),
  group_code: external_exports.string(),
  severity,
  numeric_value: external_exports.number().nullable(),
  unit: external_exports.string().nullable(),
  text_note: external_exports.string().nullable(),
  na_reason: naReason.nullable(),
  refurb_cost_minor: external_exports.number().nullable(),
  evidence_ref_ids: external_exports.array(external_exports.string()),
  answered_at: external_exports.string().nullable(),
  inspector_override: external_exports.boolean().optional(),
  ml_suggestion: mlSuggestion.nullable().optional()
});
var evidenceRefView = external_exports.object({
  id: external_exports.string(),
  item_code: external_exports.string(),
  shot_code: external_exports.string(),
  kind: evidenceKind,
  captured_at: external_exports.string().nullable()
});
var perGroupScore = external_exports.object({
  group_code: external_exports.string(),
  weight: external_exports.number(),
  score: external_exports.number(),
  assessed_count: external_exports.number().int(),
  applicable_count: external_exports.number().int()
});
var scoreReason = external_exports.object({ code: external_exports.string(), detail: external_exports.string() });
var scoreResult = external_exports.object({
  overall_score: external_exports.number(),
  // 0–100
  coverage_pct: external_exports.number(),
  // 0–100
  grade,
  grade_cap_reason: gradeCapReason.nullable(),
  per_group: external_exports.array(perGroupScore),
  reasons: external_exports.array(scoreReason),
  checklist_version: external_exports.number().int(),
  scoring_config_version: external_exports.number().int()
});
var inspectionVehiclePacket = external_exports.object({
  make: external_exports.string(),
  model: external_exports.string(),
  variant: external_exports.string().nullable(),
  category: inspectionCategory,
  fuel: external_exports.string(),
  body_type: external_exports.string().nullable(),
  segment: external_exports.string().nullable(),
  segment_tier: external_exports.enum(["BUDGET", "PREMIUM", "LUXURY"]),
  base_ex_showroom_minor: external_exports.number().int().nullable(),
  reference_year: external_exports.number().int().nullable(),
  mfg_year: external_exports.number().int(),
  age_years: external_exports.number().int().min(0),
  registry_engine_cc: external_exports.number().int().nullable().optional(),
  registry_seat_capacity: external_exports.number().int().nullable().optional(),
  registry_body_type: external_exports.string().nullable().optional(),
  registry_color: external_exports.string().nullable().optional(),
  registry_rc_city: external_exports.string().nullable().optional(),
  registry_rc_state: external_exports.string().nullable().optional(),
  registry_rc_status: external_exports.string().nullable().optional(),
  registry_insurance_company: external_exports.string().nullable().optional(),
  registry_insurance_upto: external_exports.string().nullable().optional(),
  registry_fit_upto: external_exports.string().nullable().optional(),
  registry_tax_upto: external_exports.string().nullable().optional(),
  registry_pucc_upto: external_exports.string().nullable().optional(),
  registry_financed: external_exports.string().nullable().optional(),
  registry_owner_count: external_exports.number().int().nullable().optional(),
  registry_mfg_month: external_exports.number().int().nullable().optional(),
  registry_registration_date: external_exports.string().nullable().optional(),
  registry_norms_type: external_exports.string().nullable().optional(),
  registry_vehicle_category_description: external_exports.string().nullable().optional(),
  registry_vehicle_gross_weight: external_exports.number().int().nullable().optional(),
  registry_no_cylinders: external_exports.number().int().nullable().optional(),
  registry_unladen_weight: external_exports.number().int().nullable().optional(),
  registry_sleeper_capacity: external_exports.number().int().nullable().optional(),
  registry_standing_capacity: external_exports.number().int().nullable().optional(),
  registry_wheelbase: external_exports.string().nullable().optional(),
  registry_pucc_number: external_exports.string().nullable().optional(),
  registry_permit_number: external_exports.string().nullable().optional(),
  registry_permit_issue_date: external_exports.string().nullable().optional(),
  registry_permit_valid_from: external_exports.string().nullable().optional(),
  registry_permit_valid_upto: external_exports.string().nullable().optional(),
  registry_permit_type: external_exports.string().nullable().optional(),
  registry_national_permit_number: external_exports.string().nullable().optional(),
  registry_national_permit_upto: external_exports.string().nullable().optional(),
  registry_national_permit_issued_by: external_exports.string().nullable().optional(),
  registry_non_use_status: external_exports.string().nullable().optional(),
  registry_non_use_from: external_exports.string().nullable().optional(),
  registry_non_use_to: external_exports.string().nullable().optional(),
  registry_blacklist_status: external_exports.string().nullable().optional(),
  registry_noc_details: external_exports.string().nullable().optional(),
  registry_rto_code: external_exports.string().nullable().optional(),
  registry_has_vin_baseline: external_exports.boolean().nullable().optional(),
  registry_has_engine_baseline: external_exports.boolean().nullable().optional()
});
var inspectionView = external_exports.object({
  id: external_exports.string(),
  vehicle_id: external_exports.string(),
  mode: inspectionMode,
  category: inspectionCategory,
  status: inspectionEngineStatus,
  checklist_version: external_exports.number().int(),
  scoring_config_version: external_exports.number().int().nullable(),
  coverage_pct: external_exports.number().nullable(),
  overall_score: external_exports.number().nullable(),
  grade: grade.nullable(),
  grade_cap_reason: gradeCapReason.nullable(),
  qc_status: qcStatus.nullable(),
  version: external_exports.number().int(),
  parent_inspection_id: external_exports.string().nullable(),
  items: external_exports.array(inspectionItemView),
  evidence_refs: external_exports.array(evidenceRefView),
  created_at: external_exports.string(),
  submitted_at: external_exports.string().nullable(),
  verified_at: external_exports.string().nullable(),
  vehicle: inspectionVehiclePacket.nullable().optional()
});
var inspectionReport = external_exports.object({
  inspection_id: external_exports.string(),
  vehicle_id: external_exports.string(),
  mode: inspectionMode,
  status: inspectionEngineStatus,
  qc_status: qcStatus.nullable(),
  grade_not_ready: external_exports.boolean(),
  score: scoreResult.nullable(),
  is_turag_verified: external_exports.boolean(),
  findings: external_exports.array(reportFinding),
  generated_at: external_exports.string()
});
var inspectionResponse = external_exports.object({ inspection: inspectionView, request_id: external_exports.string() });
var qcQueueScope = external_exports.enum(["pending", "redaction", "passed", "self"]);
var qcQueueItem = external_exports.object({
  inspection: inspectionView,
  // Present only for the post-QC scopes (redaction/passed); omitted for the pending queue (unchanged).
  photo_total: external_exports.number().int().nonnegative().optional(),
  photo_redacted: external_exports.number().int().nonnegative().optional()
});
var qcQueueResponse = external_exports.object({ items: external_exports.array(qcQueueItem), request_id: external_exports.string() });
var identityFieldVerdict = external_exports.enum(["MATCH", "MISMATCH", "UNREADABLE", "NOT_AVAILABLE"]);
var identityVerifyRequest = external_exports.object({
  vin: external_exports.string().max(40).nullish(),
  engine_number: external_exports.string().max(40).nullish(),
  front_plate: external_exports.string().max(20).nullish(),
  rear_plate: external_exports.string().max(20).nullish(),
  make: external_exports.string().max(120).nullish(),
  model: external_exports.string().max(120).nullish(),
  variant: external_exports.string().max(120).nullish(),
  mfg_year: external_exports.number().int().min(1980).max(2100).nullish(),
  fuel: external_exports.string().max(20).nullish(),
  category: external_exports.string().max(20).nullish(),
  color: external_exports.string().max(120).nullish()
});
var identityVerifyVerdicts = external_exports.object({
  vin: identityFieldVerdict,
  engine_number: identityFieldVerdict,
  registration_number: identityFieldVerdict,
  make: identityFieldVerdict,
  model: identityFieldVerdict,
  variant: identityFieldVerdict,
  mfg_year: identityFieldVerdict,
  fuel: identityFieldVerdict,
  category: identityFieldVerdict,
  color: identityFieldVerdict,
  has_baseline: external_exports.boolean()
});
var identityVerifyResponse = external_exports.object({
  verdicts: identityVerifyVerdicts,
  request_id: external_exports.string()
});
var inspectionReportResponse = external_exports.object({ report: inspectionReport, request_id: external_exports.string() });
var evidenceRegisteredResponse = external_exports.object({ evidence: evidenceRefView, request_id: external_exports.string() });

// ../../packages/contracts/src/media.ts
var mediaKind = external_exports.enum(["PHOTO", "VIDEO", "AUDIO", "DOCUMENT"]);
var derivativeVariant = external_exports.enum(["THUMB", "MEDIUM", "LARGE", "REDACTED"]);
var mediaStatus = external_exports.enum([
  "UPLOAD_REQUESTED",
  "UPLOADED",
  "PROCESSING",
  "PROCESSED",
  "INTEGRITY_FLAGGED",
  "REDACTION_HELD",
  "REJECTED"
]);
var redactionStatus = external_exports.enum(["PENDING", "REDACTED", "NOT_REQUIRED"]);
var integritySignal = external_exports.object({
  key: external_exports.string(),
  klass: external_exports.enum(["PROVEN", "INFERRED", "NOT_PROVEN"]),
  status: external_exports.enum(["PASS", "FAIL", "NOT_EVALUATED"]),
  detail: external_exports.string().optional()
});
var integrityResult = external_exports.object({
  /** Risk 0–100 from signals actually computed (PROVEN + INFERRED detections), never from NOT_EVALUATED
   *  (the honesty rule; spec §6.4 bands). */
  risk_score: external_exports.number().int().min(0).max(100),
  signals: external_exports.array(integritySignal),
  evaluated_at: external_exports.string()
});
var checksumSha256 = external_exports.string().regex(/^[a-f0-9]{64}$/, "expected a lowercase hex SHA-256");
var requestUploadRequest = external_exports.object({
  item_code: external_exports.string().min(1),
  shot_code: external_exports.string().min(1),
  kind: mediaKind,
  content_type: external_exports.string().min(1),
  byte_size: external_exports.number().int().positive(),
  checksum_sha256: checksumSha256,
  client_asset_id: external_exports.string().min(1),
  captured_at: external_exports.string().optional(),
  gps: external_exports.object({ lat: external_exports.number(), lng: external_exports.number(), accuracy_m: external_exports.number().optional() }).optional(),
  // §6.4 provenance: client-declared capture order + (mobile-only) raw device attestation. Both untrusted
  // and validated at the boundary here; the attestation token is stored verbatim and verified later.
  sequence_index: external_exports.number().int().nonnegative().optional(),
  device_attestation: external_exports.object({
    platform: external_exports.enum(["android", "ios"]),
    token: external_exports.string().min(1),
    collected_at: external_exports.string()
  }).optional()
});
var checkDuplicateRequest = external_exports.object({ checksum_sha256: checksumSha256 });
var checkDuplicateResponse = external_exports.object({ duplicate: external_exports.boolean(), request_id: external_exports.string() });
var uploadTarget = external_exports.object({
  url: external_exports.string(),
  method: external_exports.literal("PUT"),
  headers: external_exports.record(external_exports.string(), external_exports.string()),
  expires_at: external_exports.string()
});
var mediaDerivativeView = external_exports.object({
  variant: derivativeVariant,
  width: external_exports.number().int().nullable(),
  height: external_exports.number().int().nullable(),
  blurhash: external_exports.string().nullable()
});
var suggestedRedactionView = external_exports.object({
  x: external_exports.number(),
  y: external_exports.number(),
  w: external_exports.number(),
  h: external_exports.number(),
  kind: external_exports.enum(["PLATE", "FACE", "DOC_PII"]),
  confidence: external_exports.number()
});
var ocrSummaryView = external_exports.object({
  doc_type: external_exports.enum(["RC", "INSURANCE", "PUC", "UNKNOWN"]),
  needs_review: external_exports.boolean(),
  reviewed: external_exports.boolean(),
  status_override: external_exports.enum(["PRESENT", "EXPIRED", "MISSING", "FLAGGED", "NOT_ASSESSED"]).nullable(),
  field_count: external_exports.number().int()
});
var aiFindingResult = external_exports.object({
  shot_code: external_exports.string().min(1),
  has_damage: external_exports.boolean(),
  panel: external_exports.string().min(1).max(40).nullable(),
  damage_type: external_exports.enum(["DENT", "SCRATCH", "CRACK", "RUST", "MISSING", "NONE"]),
  severity: external_exports.enum(["NONE", "MINOR", "MODERATE", "MAJOR", "CRITICAL"]),
  repair_or_replace: external_exports.enum(["REPAIR", "REPLACE", "NONE"]),
  repair_cost_minor: external_exports.number().int().min(0),
  repaint: external_exports.boolean(),
  confidence: external_exports.number().min(0).max(1),
  manual_review: external_exports.boolean(),
  observation: external_exports.string().max(280).nullable(),
  plate: external_exports.string().max(20).nullable(),
  engine_version: external_exports.string().min(1).max(40),
  analyzed_at: external_exports.string().min(1),
  /**
   * Cosmetic aging observations (paint fade/peel, haze, wear). Optional so
   * rows persisted before this field existed keep parsing; absent → [].
   */
  cosmetic: external_exports.array(
    external_exports.object({
      area: external_exports.enum(["PAINT", "LAMPS", "GLASS", "TYRES_WHEELS", "PANELS", "INTERIOR", "OTHER"]),
      observation: external_exports.string().max(120),
      severity: external_exports.enum(["MINOR", "MODERATE", "MAJOR"])
    })
  ).max(4).optional(),
  /**
   * Advisory trained-model damage localisations (worker-only inference). Optional so legacy rows and every
   * client VLM save keep parsing (absent → none). Normalized [0,1] boxes; ADVISORY ONLY — never a
   * scoring/submit/report input. `severity` is null when the localiser did not assess it.
   */
  model_detections: external_exports.array(
    external_exports.object({
      kind: external_exports.literal("DAMAGE"),
      type: external_exports.enum(["DENT", "SCRATCH", "CRACK", "RUST", "MISSING"]),
      severity: external_exports.enum(["MINOR", "MODERATE", "MAJOR", "CRITICAL"]).nullable(),
      confidence: external_exports.number().min(0).max(1),
      bbox: external_exports.object({
        x: external_exports.number().min(0).max(1),
        y: external_exports.number().min(0).max(1),
        w: external_exports.number().min(0).max(1),
        h: external_exports.number().min(0).max(1)
      }),
      affected_part: external_exports.string().max(40).nullable(),
      model_version: external_exports.string().min(1).max(60)
    })
  ).max(50).optional(),
  /** Provenance of the primary verdict. Optional: absent → 'vlm-v2' (every legacy row / client VLM save). */
  detection_source: external_exports.enum(["vlm-v2", "ml-model"]).optional()
});
var saveAiFindingRequest = external_exports.object({
  finding: aiFindingResult
});
var mediaView = external_exports.object({
  id: external_exports.string(),
  inspection_id: external_exports.string(),
  item_code: external_exports.string(),
  shot_code: external_exports.string(),
  kind: mediaKind,
  status: mediaStatus,
  redaction_status: redactionStatus,
  content_type: external_exports.string(),
  byte_size: external_exports.number().int(),
  integrity: integrityResult.nullable(),
  /** Derived, never a stored boolean: publishable only when redaction_status='REDACTED'. */
  published: external_exports.boolean(),
  /** Assistive plate/face redaction suggestions for the ops editor (D3); null when none were computed. */
  suggested_redactions: external_exports.array(suggestedRedactionView).nullable(),
  /** D4 document-OCR summary (DOCUMENT assets only; null otherwise) for the ops review panel. */
  ocr: ocrSummaryView.nullable(),
  /** Advisory B1/V2 damage finding saved by the capture client (PHOTO assets only; null otherwise). */
  ai_finding: aiFindingResult.nullable(),
  derivatives: external_exports.array(mediaDerivativeView),
  failure_reason: external_exports.string().nullable(),
  created_at: external_exports.string(),
  processed_at: external_exports.string().nullable()
});
var redactionBoxDto = external_exports.object({
  x: external_exports.number().min(0).max(1),
  y: external_exports.number().min(0).max(1),
  w: external_exports.number().gt(0).max(1),
  h: external_exports.number().gt(0).max(1),
  kind: external_exports.enum(["FACE", "PLATE"])
});
var redactMediaRequest = external_exports.object({
  boxes: external_exports.array(redactionBoxDto).max(20),
  /** The plate brand label; applied only to PLATE boxes (FACE boxes are blurred, never labelled). */
  label: external_exports.enum(["TURAG", "T"]).nullable()
});
var ocrReviewRequest = external_exports.object({
  status_override: external_exports.enum(["PRESENT", "EXPIRED", "MISSING", "FLAGGED", "NOT_ASSESSED"]).nullable().optional(),
  note: external_exports.string().max(500).nullable().optional()
});
var requestUploadResponse = external_exports.object({
  media_id: external_exports.string(),
  upload: uploadTarget,
  request_id: external_exports.string()
});
var mediaResponse = external_exports.object({ media: mediaView, request_id: external_exports.string() });
var mediaListResponse = external_exports.object({ items: external_exports.array(mediaView), request_id: external_exports.string() });
var derivativeUrlResponse = external_exports.object({
  url: external_exports.string(),
  expires_at: external_exports.string(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/report-data.ts
var verificationLabel = external_exports.enum([
  "TURAG_VERIFIED",
  "VERIFIED_NOT_TURAG",
  "SELF_DECLARED_UNVERIFIED",
  "NOT_VERIFIED"
]);
var validityWindow = external_exports.object({ valid_from: external_exports.string(), valid_until: external_exports.string(), expired: external_exports.boolean() });
var band3 = external_exports.object({ low: external_exports.number(), high: external_exports.number() });
var reportVehicle = external_exports.object({
  make: external_exports.string(),
  model: external_exports.string(),
  variant: external_exports.string().nullable(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  category: inspectionCategory,
  owner_name: external_exports.string().nullable(),
  hypothecation: external_exports.boolean().nullable(),
  registration_number: external_exports.string().nullable()
});
var reportEvidence = external_exports.object({
  media_id: external_exports.string(),
  item_code: external_exports.string(),
  shot_code: external_exports.string(),
  kind: external_exports.string(),
  status: external_exports.string(),
  has_derivative: external_exports.boolean(),
  /** The asset's integrity was proven and frozen (Phase 5) — the "sealed" evidence signal. */
  sealed: external_exports.boolean(),
  thumb_url: external_exports.string().nullable()
});
var reportValuation = external_exports.discriminatedUnion("status", [
  external_exports.object({
    status: external_exports.literal("READY"),
    bands: external_exports.object({ distress: band3, auction: band3, trade_in: band3, retail: band3 }),
    headline: external_exports.object({ value: external_exports.number(), band: external_exports.string() }),
    confidence: external_exports.object({ level: external_exports.string(), score: external_exports.number(), basis: external_exports.string() }),
    model_version: external_exports.string(),
    valid_until: external_exports.string()
  }),
  external_exports.object({ status: external_exports.literal("NOT_READY"), reason: external_exports.string() })
]);
var reportInspector = external_exports.object({
  name: external_exports.string(),
  verified_id: external_exports.boolean(),
  /** Masked (DPDP) — present only in the AUTHENTICATED report; never in the public projection. */
  phone_masked: external_exports.string().nullable()
});
var reportDocument = external_exports.object({
  doc_type: external_exports.string(),
  status: external_exports.enum(["PRESENT", "EXPIRED", "MISSING", "FLAGGED", "NOT_ASSESSED"]),
  detail: external_exports.string().optional()
});
var reportDisclaimer = external_exports.object({
  version: external_exports.string().nullable(),
  ref: external_exports.string().nullable(),
  is_placeholder: external_exports.boolean()
});
var reportVerification = external_exports.object({
  verification_label: verificationLabel,
  turag_verified: external_exports.boolean(),
  mode: inspectionMode,
  qc_status: qcStatus.nullable(),
  coverage_pct: external_exports.number().nullable(),
  validity: validityWindow
});
var reportRegistry = external_exports.object({
  provider: external_exports.string(),
  fetched_at: external_exports.string(),
  make: external_exports.string(),
  model: external_exports.string(),
  fuel: external_exports.string(),
  variant_text: external_exports.string().nullable(),
  rto_code: external_exports.string().nullable(),
  rc_city: external_exports.string().nullable(),
  rc_state: external_exports.string().nullable(),
  registration_date: external_exports.string().nullable(),
  mfg_month: external_exports.number().int().nullable(),
  rc_status: external_exports.string().nullable(),
  blacklist_status: external_exports.string().nullable(),
  non_use_status: external_exports.string().nullable(),
  engine_cc: external_exports.number().nullable(),
  no_cylinders: external_exports.number().nullable(),
  seat_capacity: external_exports.number().nullable(),
  standing_capacity: external_exports.number().nullable(),
  sleeper_capacity: external_exports.number().nullable(),
  gross_weight: external_exports.number().nullable(),
  unladen_weight: external_exports.number().nullable(),
  wheelbase: external_exports.string().nullable(),
  body_type: external_exports.string().nullable(),
  color: external_exports.string().nullable(),
  norms_type: external_exports.string().nullable(),
  vehicle_class: external_exports.string().nullable(),
  insurance_company: external_exports.string().nullable(),
  insurance_upto: external_exports.string().nullable(),
  fit_upto: external_exports.string().nullable(),
  tax_upto: external_exports.string().nullable(),
  pucc_upto: external_exports.string().nullable(),
  pucc_number: external_exports.string().nullable(),
  owner_count: external_exports.number().int().nullable(),
  financed: external_exports.boolean().nullable(),
  /** Salted-hash PRESENCE only — the registry holds this identity on record (the value is NEVER stored/shown). */
  registration_on_record: external_exports.boolean(),
  vin_on_record: external_exports.boolean(),
  engine_on_record: external_exports.boolean()
});
var reportIdentityCheck = external_exports.object({
  status: external_exports.enum(["VERIFIED", "FLAGGED", "NOT_ASSESSED"]),
  note: external_exports.string().nullable()
});
var reportChecklistItem = external_exports.object({
  group_code: external_exports.string(),
  group_label: external_exports.string(),
  item_code: external_exports.string(),
  label: external_exports.string(),
  severity: external_exports.string(),
  numeric_value: external_exports.number().nullable(),
  unit: external_exports.string().nullable(),
  note: external_exports.string().nullable(),
  scored: external_exports.boolean()
});
var reportData = external_exports.object({
  identity: external_exports.object({
    inspection_id: external_exports.string(),
    // The vehicle + pinned valuation this report is about, so the OWNER can act on it directly (e.g. list
    // the vehicle from the report). AUTHENTICATED report only — deliberately NOT in the public projection,
    // which stays PII-minimal (decision 4). valuation_id is null when no valid valuation was pinned at QC.
    vehicle_id: external_exports.string(),
    valuation_id: external_exports.string().nullable(),
    version: external_exports.number().int(),
    parent_inspection_id: external_exports.string().nullable(),
    verification_token: external_exports.string().nullable(),
    verified_at: external_exports.string().nullable(),
    checklist_version: external_exports.number().int(),
    scoring_config_version: external_exports.number().int().nullable()
  }),
  vehicle: reportVehicle,
  assessment: external_exports.object({
    mode: inspectionMode,
    status: inspectionEngineStatus,
    qc_status: qcStatus.nullable(),
    grade: grade.nullable(),
    grade_cap_reason: gradeCapReason.nullable(),
    overall_score: external_exports.number().nullable(),
    coverage_pct: external_exports.number().nullable(),
    per_group: external_exports.array(perGroupScore),
    grade_not_ready: external_exports.boolean()
  }),
  verification: reportVerification,
  findings: external_exports.array(reportFinding),
  evidence: external_exports.array(reportEvidence),
  valuation: reportValuation,
  inspector: reportInspector.nullable(),
  documents: external_exports.array(reportDocument),
  disclaimer: reportDisclaimer,
  // --- Report-presentation additions (all additive/optional; non-PII; deterministic from frozen inputs).
  //     Backward compatible: absent on older payloads, populated by the current assembler. ---
  /** RTO/Vahan section from the linked registry snapshot (non-PII). null when no snapshot is linked. */
  registry: reportRegistry.nullable().optional(),
  /** Identity-gate outcome (persisted signal; live per-field verdicts are ephemeral by DPDP design). */
  identity_check: reportIdentityCheck.nullable().optional(),
  /** Every assessed item with its real label + Turag severity — the detailed inspection breakdown. */
  checklist: external_exports.array(reportChecklistItem).optional(),
  /** Odometer reading (km) declared/observed in the inspection (item O1). null when not captured. */
  odometer_km: external_exports.number().nullable().optional(),
  /** Previous-owner count declared in the inspection (item O2). null when not captured. */
  owners_declared: external_exports.number().int().nullable().optional(),
  /** group_code → human group label, from the pinned checklist (for the score breakdown). */
  group_labels: external_exports.record(external_exports.string()).optional(),
  /** The vehicle's active listing (PENDING_REVIEW/LIVE), if any — so the report can disable "List this
   *  vehicle" once it's already listed. Null/absent when not currently listed. Non-PII (id + status). */
  active_listing: external_exports.object({ listing_id: external_exports.string(), status: external_exports.string() }).nullable().optional(),
  /** Render metadata — NOT part of the deterministic canonical content. */
  generated_at: external_exports.string()
});
var publicVerification = external_exports.object({
  verification_token: external_exports.string(),
  verification_label: verificationLabel,
  grade: grade.nullable(),
  coverage_pct: external_exports.number().nullable(),
  mode: inspectionMode,
  validity: external_exports.object({ valid_until: external_exports.string(), expired: external_exports.boolean() }),
  vehicle: external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() }),
  inspector: external_exports.object({ name: external_exports.string(), verified_id: external_exports.boolean() }),
  verified_at: external_exports.string().nullable(),
  disclaimer: external_exports.object({ version: external_exports.string().nullable(), ref: external_exports.string().nullable() })
});
var reportPdfStatus = external_exports.enum(["READY", "GENERATING", "FAILED", "NOT_AVAILABLE"]);
var reportPdfResponse = external_exports.discriminatedUnion("status", [
  external_exports.object({ status: external_exports.literal("READY"), url: external_exports.string(), expires_at: external_exports.string(), request_id: external_exports.string() }),
  external_exports.object({ status: external_exports.literal("GENERATING"), job_id: external_exports.string(), request_id: external_exports.string() }),
  external_exports.object({ status: external_exports.literal("FAILED"), job_id: external_exports.string(), request_id: external_exports.string() }),
  external_exports.object({ status: external_exports.literal("NOT_AVAILABLE"), reason: external_exports.string(), request_id: external_exports.string() })
]);
var reportDataResponse = external_exports.object({ report: reportData, request_id: external_exports.string() });
var publicVerificationResponse = external_exports.object({ verification: publicVerification, request_id: external_exports.string() });
var shareResponse = external_exports.object({ share_url: external_exports.string(), verify_url: external_exports.string(), expires_at: external_exports.string(), request_id: external_exports.string() });

// ../../packages/contracts/src/listings.ts
var listingStatus = external_exports.enum(["DRAFT", "PENDING_REVIEW", "REJECTED", "LIVE", "RESERVED", "WITHDRAWN", "EXPIRED"]);
var listingChannel = external_exports.enum(["PUBLIC", "INSTITUTIONAL"]);
var listingType = external_exports.enum(["FIXED", "AUCTION"]);
var money = external_exports.object({ amount_minor: external_exports.number().int().positive(), currency: external_exports.literal("INR") });
var listingVehicle = external_exports.object({
  make: external_exports.string(),
  model: external_exports.string(),
  variant: external_exports.string().nullable(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  category: inspectionCategory
});
var listingVerification = external_exports.object({
  verification_label: verificationLabel,
  turag_verified: external_exports.boolean(),
  mode: inspectionMode.nullable(),
  qc_status: qcStatus.nullable(),
  coverage_pct: external_exports.number().nullable(),
  grade: grade.nullable()
});
var createListingRequest = external_exports.object({
  vehicle_id: external_exports.string(),
  valuation_id: external_exports.string(),
  inspection_id: external_exports.string().nullable().optional(),
  ask_price: money,
  reserve_price: money.nullable().optional(),
  seller_note: external_exports.string().max(2e3).nullable().optional(),
  /** Seller-declared launch-region city (Phase 8) — controlled enum, never free text. */
  city: external_exports.enum(["PUNE", "PCMC"]).nullable().optional(),
  ownership_attested: external_exports.literal(true)
});
var updateListingRequest = external_exports.object({
  ask_price: money.optional(),
  reserve_price: money.nullable().optional(),
  status: external_exports.literal("WITHDRAWN").optional(),
  version: external_exports.number().int().positive()
});
var moderateListingRequest = external_exports.object({
  decision: external_exports.enum(["APPROVE", "REJECT"]),
  reason: external_exports.string().max(1e3).nullable().optional()
});
var listingView = external_exports.object({
  listing_id: external_exports.string(),
  status: listingStatus,
  channel: listingChannel,
  listing_type: listingType,
  vehicle: listingVehicle,
  ask_price: money,
  reserve_price: money.nullable(),
  seller_note: external_exports.string().nullable(),
  /** Seller self-declared ownership — NEVER verified ownership. */
  ownership_attested: external_exports.boolean(),
  verification: listingVerification,
  /** The pinned valuation snapshot as price context (READY) or NOT_READY (production fail-closed). */
  valuation_context: reportValuation,
  /** Present when an inspection is pinned — lets the preview screen fetch the full report. */
  inspection_id: external_exports.string().nullable(),
  moderation: external_exports.object({ reason: external_exports.string().nullable() }),
  published_at: external_exports.string().nullable(),
  expires_at: external_exports.string().nullable(),
  view_count: external_exports.number().int(),
  version: external_exports.number().int(),
  created_at: external_exports.string(),
  updated_at: external_exports.string().nullable()
});
var listingSummary = external_exports.object({
  listing_id: external_exports.string(),
  status: listingStatus,
  vehicle: external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() }),
  ask_price: money,
  verification_label: verificationLabel,
  /** Non-authoritative view counter (the same count shown on the listing detail). Lets the dashboard sort by
   *  "most viewed" without a per-row fetch. */
  view_count: external_exports.number().int().nonnegative(),
  /** Total offers received on this listing (any status) — the "N offers" the dashboard shows, computed in one
   *  grouped query so the list never fans out per row. 0 before the listing goes LIVE. */
  offer_count: external_exports.number().int().nonnegative(),
  /** Launch-preview showcase marker (ops): the listing is shown in the marketplace with a SOLD badge and
   *  is not open for offers. Presentation only — the listing stays LIVE. Defaults false. */
  is_showcase_sold: external_exports.boolean().default(false),
  created_at: external_exports.string(),
  published_at: external_exports.string().nullable(),
  expires_at: external_exports.string().nullable()
});
var listingResponse = external_exports.object({ listing: listingView, request_id: external_exports.string() });
var listingListResponse = external_exports.object({ listings: external_exports.array(listingSummary), request_id: external_exports.string() });
var setShowcaseRequest = external_exports.object({
  listing_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100),
  sold: external_exports.boolean()
});
var setShowcaseResponse = external_exports.object({
  /** How many listings were actually changed (a LIVE listing that was already in the requested state, or a
   *  non-LIVE one that can't be showcased, is skipped). */
  updated: external_exports.number().int().nonnegative(),
  skipped: external_exports.number().int().nonnegative(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/marketplace.ts
var marketplaceCity = external_exports.string().max(50);
var marketplaceSort = external_exports.enum(["price_asc", "price_desc", "recent", "relevance"]);
var marketplaceFilters = external_exports.object({
  category: inspectionCategory.optional(),
  city: marketplaceCity.optional(),
  make: external_exports.string().max(50).optional(),
  model: external_exports.string().max(50).optional(),
  price_min: external_exports.number().int().nonnegative().optional(),
  price_max: external_exports.number().int().positive().optional(),
  min_price: external_exports.number().int().nonnegative().optional(),
  max_price: external_exports.number().int().positive().optional(),
  grade_min: grade.optional(),
  fuel: external_exports.string().max(30).optional(),
  transmission: external_exports.string().max(30).optional(),
  body_type: external_exports.string().max(50).optional(),
  vehicle_type: external_exports.string().max(50).optional(),
  color: external_exports.string().max(30).optional(),
  year: external_exports.number().int().optional(),
  year_min: external_exports.number().int().optional(),
  year_max: external_exports.number().int().optional(),
  mileage_min: external_exports.number().nonnegative().optional(),
  mileage_max: external_exports.number().nonnegative().optional(),
  odometer_max: external_exports.number().nonnegative().optional(),
  seating_capacity: external_exports.number().int().positive().optional(),
  seats_min: external_exports.number().int().positive().optional(),
  seats_max: external_exports.number().int().positive().optional(),
  engine_cc_min: external_exports.number().nonnegative().optional(),
  engine_cc_max: external_exports.number().nonnegative().optional(),
  bhp_min: external_exports.number().nonnegative().optional(),
  bhp_max: external_exports.number().nonnegative().optional(),
  drive_type: external_exports.string().max(30).optional(),
  features: external_exports.string().max(200).optional(),
  exclude_fuel: external_exports.string().max(50).optional(),
  exclude_color: external_exports.string().max(50).optional(),
  exclude_transmission: external_exports.string().max(50).optional(),
  q: external_exports.string().max(120).optional(),
  // free-text (Postgres FTS)
  sort: marketplaceSort.optional(),
  cursor: external_exports.string().max(200).optional(),
  limit: external_exports.number().int().positive().max(100).optional(),
  page: external_exports.number().int().positive().optional()
});
var vehicleFacets = {
  make: external_exports.string(),
  model: external_exports.string(),
  variant: external_exports.string().nullable(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  category: inspectionCategory,
  vehicle_type: external_exports.string().nullable().optional(),
  body_type: external_exports.string().nullable().optional(),
  transmission: external_exports.string().nullable().optional(),
  color: external_exports.string().nullable().optional(),
  mileage_kmpl: external_exports.number().nullable().optional(),
  seating_capacity: external_exports.number().int().nullable().optional(),
  engine_cc: external_exports.number().int().nullable().optional(),
  horsepower: external_exports.number().nullable().optional(),
  drive_type: external_exports.string().nullable().optional(),
  features: external_exports.string().nullable().optional()
};
var publicFairPrice = external_exports.object({
  ask_price: money,
  estimate_low: money.nullable(),
  estimate_high: money.nullable(),
  assessment: external_exports.enum(["FAIRLY_PRICED", "ABOVE_ESTIMATE", "BELOW_ESTIMATE", "NO_ESTIMATE"])
});
var publicFindingsSummary = external_exports.object({
  major_count: external_exports.number().int().nonnegative(),
  rectification_cost_minor: external_exports.number().int().nonnegative()
});
var publicListingSummary = external_exports.object({
  listing_id: external_exports.string(),
  ...vehicleFacets,
  city: marketplaceCity.nullable(),
  ask_price: money,
  grade: grade.nullable(),
  coverage_pct: external_exports.number().nullable(),
  verification_label: verificationLabel,
  status: external_exports.enum(["LIVE", "RESERVED"]),
  fair_price: publicFairPrice,
  findings_summary: publicFindingsSummary.nullable(),
  /** Short-lived signed URL to the first redacted photo; null until ops approves redaction. */
  hero_photo_url: external_exports.string().nullable(),
  /** Launch-preview showcase listing: shown with a SOLD badge and not open for offers (a real account
   *  listing curated by ops for the pre-launch showcase). Defaults false. */
  is_showcase: external_exports.boolean().default(false),
  published_at: external_exports.string().nullable()
});
var publicGroupScore = external_exports.object({
  group_code: external_exports.string(),
  group_label: external_exports.string(),
  score: external_exports.number()
});
var publicReport = external_exports.object({
  grade: grade.nullable(),
  /** Weighted overall condition score, 0–100 (the report's headline "x/10" × 10). Null when not ready. */
  overall_score: external_exports.number().nullable(),
  /** Per-group condition breakdown (assessed groups only), worst-informative first as the report orders it. */
  score_breakdown: external_exports.array(publicGroupScore),
  coverage_pct: external_exports.number().nullable(),
  grade_not_ready: external_exports.boolean(),
  verification_label: verificationLabel,
  turag_verified: external_exports.boolean(),
  mode: inspectionMode.nullable(),
  valid_until: external_exports.string().nullable(),
  expired: external_exports.boolean(),
  findings: external_exports.array(reportFinding),
  // worst-first
  documents: external_exports.array(reportDocument),
  inspector_name: external_exports.string().nullable(),
  // name only — never phone
  verification_token: external_exports.string().nullable()
});
var publicEligibility = external_exports.object({ eligible: external_exports.boolean(), reason: external_exports.string().nullable() });
var publicListingOverview = external_exports.object({
  make_year: external_exports.number().int(),
  /** 1–12 from the registry manufacturing month; null when the vendor omitted it. */
  make_month: external_exports.number().int().min(1).max(12).nullable(),
  fuel: external_exports.string(),
  /** RTO office code (e.g. "MH12") from the registry snapshot; null when no snapshot/field. */
  rto_code: external_exports.string().nullable(),
  /** RTO city (e.g. "Pune") — coarse location, never the full registration number. */
  rc_city: external_exports.string().nullable(),
  /** RTO state (e.g. "Maharashtra"). */
  rc_state: external_exports.string().nullable(),
  /** Odometer reading from the pinned inspection's O1 answer; null when not inspected/recorded. */
  km_driven: external_exports.number().int().nonnegative().nullable(),
  /** Registered-owner COUNT only — never owner identity (PII). Registry value, else inspection O2. */
  owner_count: external_exports.number().int().nonnegative().nullable(),
  registration_year: external_exports.number().int().nullable(),
  registration_month: external_exports.number().int().min(1).max(12).nullable(),
  insurance_valid_year: external_exports.number().int().nullable(),
  insurance_valid_month: external_exports.number().int().min(1).max(12).nullable(),
  transmission: external_exports.string().nullable(),
  body_type: external_exports.string().nullable(),
  color: external_exports.string().nullable(),
  seating_capacity: external_exports.number().int().positive().nullable(),
  engine_cc: external_exports.number().int().positive().nullable(),
  city: marketplaceCity.nullable()
});
var publicListingDetail = external_exports.object({
  listing_id: external_exports.string(),
  ...vehicleFacets,
  city: marketplaceCity.nullable(),
  ask_price: money,
  status: external_exports.enum(["LIVE", "RESERVED"]),
  // available | reserved
  /** Launch-preview showcase listing: shown with a SOLD badge and not open for offers. Defaults false. */
  is_showcase: external_exports.boolean().default(false),
  fair_price: publicFairPrice,
  /** At-a-glance vehicle facts (make/registration year, km, owners, insurance validity, body facts). */
  overview: publicListingOverview,
  report: publicReport.nullable(),
  // null when no inspection is pinned
  eligibility: publicEligibility,
  /** The public gallery — short-lived signed URLs to REDACTED (ops-approved) photos only. Empty until
   *  redaction approval; the raw originals are never served (INV-EVI-02). */
  photos: external_exports.array(external_exports.string()),
  /** The same redacted gallery, each photo tagged with its category so the client can render buyer-facing
   *  tabs (Exterior / Engine / Interior / Tyre / Extras). Additive to `photos` (which stays the flat list
   *  for existing consumers). `photos[i]` and `photos_by_category[i]` are the same assets in the same order. */
  photos_by_category: external_exports.array(external_exports.object({ category: shotCategory, url: external_exports.string() })),
  published_at: external_exports.string().nullable()
  // seller_note is DELIBERATELY ABSENT (withheld publicly, Phase-8 decision 10).
});
var marketplacePagination = external_exports.object({
  page: external_exports.number().int().positive(),
  limit: external_exports.number().int().positive(),
  total: external_exports.number().int().nonnegative(),
  totalPages: external_exports.number().int().nonnegative()
});
var marketplaceSearchResponse = external_exports.object({
  data: external_exports.array(publicListingSummary),
  closest_matches: external_exports.array(publicListingSummary).optional(),
  next_cursor: external_exports.string().nullable(),
  total_count: external_exports.number().int().nonnegative().optional(),
  pagination: marketplacePagination.optional(),
  request_id: external_exports.string()
});
var publicListingResponse = external_exports.object({ listing: publicListingDetail, request_id: external_exports.string() });

// ../../packages/contracts/src/offers.ts
var offerStatus = external_exports.enum(["PENDING", "COUNTERED", "ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN"]);
var offerVehicle = external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() });
var offerCounterEntry = external_exports.object({ by: external_exports.enum(["BUYER", "SELLER"]), amount: money, at: external_exports.string() });
var makeOfferRequest = external_exports.object({ amount: money });
var counterOfferRequest = external_exports.object({ amount: money });
var declineOfferRequest = external_exports.object({ reason: external_exports.string().max(500).nullable().optional() });
var offerView = external_exports.object({
  offer_id: external_exports.string(),
  listing_id: external_exports.string(),
  amount: money,
  status: offerStatus,
  expires_at: external_exports.string(),
  counter_history: external_exports.array(offerCounterEntry),
  decline_reason: external_exports.string().nullable(),
  /** The order created when this offer was accepted (else null). */
  order_id: external_exports.string().nullable(),
  /** Buyer verification signal for the seller's incoming-offers view (V1: phone-verified only). */
  buyer_verification: external_exports.object({ phone_verified: external_exports.boolean() }).nullable(),
  /** Which of the listing's pinned valuation bands this offer amount falls into (retail/trade-in/auction/
   *  below). A factual readout of approved valuation data — not a pricing recommendation. Null when the
   *  listing's valuation bands are unavailable. */
  band_position: external_exports.enum(["RETAIL", "TRADE_IN", "AUCTION", "BELOW"]).nullable(),
  vehicle: offerVehicle.nullable(),
  created_at: external_exports.string(),
  updated_at: external_exports.string().nullable()
});
var offerResponse = external_exports.object({ offer: offerView, request_id: external_exports.string() });
var offerListResponse = external_exports.object({ offers: external_exports.array(offerView), request_id: external_exports.string() });

// ../../packages/contracts/src/orders.ts
var orderStatus = external_exports.enum([
  "CREATED",
  "TOKEN_PAID",
  "HANDED_OVER",
  "COMPLETED",
  "CANCELLED"
]);
var orderView = external_exports.object({
  order_id: external_exports.string(),
  listing_id: external_exports.string(),
  offer_id: external_exports.string(),
  agreed_price: money,
  status: orderStatus,
  cancel_reason: external_exports.string().nullable(),
  vehicle: external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() }).nullable(),
  created_at: external_exports.string(),
  updated_at: external_exports.string().nullable(),
  /** When the seller/ops confirmed handover (TOKEN_PAID → HANDED_OVER); null before handover. Additive (§20). */
  handover_at: external_exports.string().nullable()
});
var orderResponse = external_exports.object({ order: orderView, request_id: external_exports.string() });
var orderQueueItem = external_exports.object({
  order_id: external_exports.string(),
  status: orderStatus,
  agreed_price: money,
  vehicle: external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() }).nullable(),
  created_at: external_exports.string(),
  handover_at: external_exports.string().nullable(),
  /** Required transfer items and how many are already verified/waived — the "N of M" the list shows. */
  transfer: external_exports.object({
    required: external_exports.number().int().nonnegative(),
    satisfied: external_exports.number().int().nonnegative()
  })
});
var orderQueueResponse = external_exports.object({
  data: external_exports.array(orderQueueItem),
  request_id: external_exports.string()
});
var transferItemCode = external_exports.enum([
  "FORM_29",
  "FORM_30",
  "FORM_28_NOC",
  "FORM_35_NOC",
  "RC_TRANSFER",
  "SELLER_KYC",
  "BUYER_KYC",
  "INSURANCE_TRANSFER",
  "DELIVERY_RECEIPT"
]);
var transferItemStatus = external_exports.enum([
  "PENDING",
  "PROVIDED",
  "VERIFIED",
  "WAIVED",
  "NOT_APPLICABLE"
]);
var transferItemDocumentView = external_exports.object({
  file_name: external_exports.string(),
  content_type: external_exports.string(),
  size_bytes: external_exports.number().int().nonnegative(),
  uploaded_at: external_exports.string()
});
var transferItemView = external_exports.object({
  code: transferItemCode,
  label: external_exports.string(),
  required: external_exports.boolean(),
  responsible: external_exports.enum(["SELLER", "BUYER", "OPS"]),
  status: transferItemStatus,
  /** The uploaded document for this item; null when none is attached, or hidden from the buyer pre-handover. */
  document: transferItemDocumentView.nullable()
});
var transferChecklistView = external_exports.object({
  version: external_exports.number().int(),
  items: external_exports.array(transferItemView)
});
var transferChecklistResponse = external_exports.object({
  checklist: transferChecklistView,
  request_id: external_exports.string()
});
var updateTransferItemRequest = external_exports.object({
  status: transferItemStatus,
  reason: external_exports.string().trim().min(1).max(500).optional()
});

// ../../packages/contracts/src/saved-listings.ts
var saveListingRequest = external_exports.object({ listing_id: external_exports.string() });
var savedListingView = external_exports.object({
  saved_id: external_exports.string(),
  listing_id: external_exports.string(),
  /** The current public summary, or null if the listing has left the marketplace since it was saved. */
  summary: publicListingSummary.nullable(),
  created_at: external_exports.string()
});
var savedListingResponse = external_exports.object({ saved: savedListingView, request_id: external_exports.string() });
var savedListingListResponse = external_exports.object({ items: external_exports.array(savedListingView), request_id: external_exports.string() });

// ../../packages/contracts/src/loan-applications.ts
var employmentType = external_exports.enum(["SALARIED", "SELF_EMPLOYED", "OTHER"]);
var loanApplicationRequest = external_exports.object({
  /** The vehicle being financed (soft refs; either/both may be present depending on where the user applies). */
  listing_id: external_exports.string().min(1).nullable().optional(),
  order_id: external_exports.string().min(1).nullable().optional(),
  vehicle_label: external_exports.string().max(200).nullable().optional(),
  vehicle_price_minor: external_exports.number().int().nonnegative().nullable().optional(),
  loan_amount_minor: external_exports.number().int().positive(),
  down_payment_minor: external_exports.number().int().nonnegative().nullable().optional(),
  tenure_months: external_exports.number().int().min(3).max(120).nullable().optional(),
  applicant_name: external_exports.string().min(1).max(120),
  email: external_exports.string().email().nullable().optional(),
  /** PAN, validated to the ABCDE1234F shape. Optional at lead stage; required later by the partner. */
  pan: external_exports.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Enter a valid PAN").nullable().optional(),
  monthly_income_minor: external_exports.number().int().nonnegative().nullable().optional(),
  employment_type: employmentType.nullable().optional(),
  city: external_exports.string().max(80).nullable().optional(),
  /** Explicit consent to be contacted and to the processing of these details for the loan enquiry. */
  consent: external_exports.literal(true)
});
var loanApplicationResponse = external_exports.object({
  application_id: external_exports.string(),
  status: external_exports.string(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/waitlist.ts
var waitlistRole = external_exports.enum(["individual", "dealer", "bank"]);
var name = external_exports.string().trim().min(2, "Please enter your name.").max(80);
var phone2 = external_exports.string().trim().min(8).max(20).regex(/^\+?[0-9\s-]+$/, "Enter a valid phone number.");
var emailOptional = external_exports.string().trim().max(120).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address.").or(external_exports.literal("")).optional();
var shortOptional = (max = 80) => external_exports.string().trim().max(max).or(external_exports.literal("")).optional();
var org = external_exports.string().trim().min(2, "Please enter the name.").max(120);
var website = external_exports.string().max(200).optional();
var individualIntent = external_exports.enum(["buy", "sell", "value", "explore"]).or(external_exports.literal("")).optional();
var dealerVolume = external_exports.enum(["lt10", "10to50", "gt50"]).or(external_exports.literal("")).optional();
var bankVolume = external_exports.enum(["lt25", "25to100", "gt100"]).or(external_exports.literal("")).optional();
var individualLead = external_exports.object({
  role: external_exports.literal("individual"),
  name,
  phone: phone2,
  email: emailOptional,
  city: shortOptional(),
  intent: individualIntent,
  website
});
var dealerLead = external_exports.object({
  role: external_exports.literal("dealer"),
  name,
  phone: phone2,
  email: emailOptional,
  org,
  city: shortOptional(),
  volume: dealerVolume,
  website
});
var bankLead = external_exports.object({
  role: external_exports.literal("bank"),
  name,
  phone: phone2,
  email: emailOptional,
  org,
  designation: shortOptional(),
  volume: bankVolume,
  website
});
var waitlistRequest = external_exports.discriminatedUnion("role", [individualLead, dealerLead, bankLead]);
var waitlistResponse = external_exports.object({ ok: external_exports.literal(true) });

// ../../packages/contracts/src/payments.ts
var paymentStatus = external_exports.enum([
  "INITIATED",
  "AUTHORIZED",
  "CAPTURED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "DISPUTED",
  "FAILED",
  "EXPIRED"
]);
var paymentPurpose = external_exports.enum([
  "INSPECTION_FEE",
  "LISTING_FEE",
  "TOKEN",
  "EMD",
  "PLATFORM_FEE",
  "SETTLEMENT",
  "REFUND"
]);
var paymentView = external_exports.object({
  payment_id: external_exports.string(),
  order_id: external_exports.string().nullable(),
  purpose: paymentPurpose,
  amount: money,
  status: paymentStatus,
  settled_at: external_exports.string().nullable(),
  created_at: external_exports.string(),
  updated_at: external_exports.string().nullable()
});
var paymentResponse = external_exports.object({ payment: paymentView, request_id: external_exports.string() });
var paymentListResponse = external_exports.object({ data: external_exports.array(paymentView), request_id: external_exports.string() });
var tokenPaymentInitRequest = external_exports.object({
  amount: money.optional(),
  /**
   * Refund Policy §2.2: the buyer's distinct affirmative acknowledgement, before paying, that the order cannot
   * be cancelled once placed. Required (enforced at the route) and recorded in the audit log as evidence.
   */
  cancellation_ack: external_exports.boolean().optional()
});
var tokenPaymentInitView = external_exports.object({
  payment_id: external_exports.string(),
  provider_order_id: external_exports.string(),
  amount: money,
  key_id: external_exports.string()
});
var tokenPaymentInitResponse = external_exports.object({ payment: tokenPaymentInitView, request_id: external_exports.string() });
var bookingPaymentInitView = external_exports.object({
  payment_id: external_exports.string(),
  provider_order_id: external_exports.string(),
  amount: money,
  key_id: external_exports.string(),
  redirect_url: external_exports.string().nullable()
});
var bookingPaymentInitResponse = external_exports.object({ payment: bookingPaymentInitView, request_id: external_exports.string() });
var refundRequest = external_exports.object({ amount: money.optional(), reason: external_exports.string().max(500).nullable().optional() });

// ../../packages/contracts/src/settlements.ts
var settlementStatus = external_exports.enum(["AWAITING_CONFIG", "AWAITING_ACCOUNT", "PENDING", "PAID", "FAILED"]);
var nonNegativeMoney = external_exports.object({ amount_minor: external_exports.number().int().min(0), currency: external_exports.literal("INR") });
var settlementAccount = external_exports.object({
  holder_name: external_exports.string(),
  bank_name: external_exports.string(),
  ifsc: external_exports.string(),
  account_number_masked: external_exports.string()
});
var settlementView = external_exports.object({
  settlement_id: external_exports.string(),
  order_id: external_exports.string(),
  /** The settled vehicle (make/model/year), resolved from the order's listing snapshot. Null if the
   *  listing snapshot is no longer resolvable — the settlement still renders by its order reference. */
  vehicle: external_exports.object({ make: external_exports.string(), model: external_exports.string(), mfg_year: external_exports.number().int() }).nullable(),
  /** What the seller receives (token − commission − GST). Null while AWAITING_CONFIG. */
  amount: money.nullable(),
  /** The deduction breakdown; null while AWAITING_CONFIG. */
  breakdown: external_exports.object({ base: nonNegativeMoney, commission: nonNegativeMoney, gst: nonNegativeMoney }).nullable(),
  /** The payout destination (masked); null until an ACTIVE verified account is bound. */
  account: settlementAccount.nullable(),
  status: settlementStatus,
  /** The bank transfer reference / UTR recorded by ops once paid. */
  provider_payout_ref: external_exports.string().nullable(),
  settled_at: external_exports.string().nullable(),
  has_receipt: external_exports.boolean(),
  failure_reason: external_exports.string().nullable(),
  created_at: external_exports.string()
});
var opsSettlementView = settlementView.extend({
  seller_id: external_exports.string(),
  paid_by: external_exports.string().nullable(),
  paid_note: external_exports.string().nullable(),
  version: external_exports.number().int()
});
var opsSettlementListResponse = external_exports.object({ data: external_exports.array(opsSettlementView), request_id: external_exports.string() });
var opsSettlementResponse = external_exports.object({ settlement: opsSettlementView, request_id: external_exports.string() });
var settlementListResponse = external_exports.object({ data: external_exports.array(settlementView), request_id: external_exports.string() });
var reconciliationRunView = external_exports.object({
  run_id: external_exports.string(),
  run_date: external_exports.string(),
  status: external_exports.enum(["RUNNING", "COMPLETED", "FAILED"]),
  discrepancy_count: external_exports.number().int(),
  started_at: external_exports.string(),
  completed_at: external_exports.string().nullable()
});
var reconciliationRunResponse = external_exports.object({ run: reconciliationRunView, request_id: external_exports.string() });

// ../../packages/contracts/src/payouts.ts
var bankAccountStatus = external_exports.enum(["DRAFT", "PENDING_VERIFICATION", "VERIFIED", "REJECTED", "ACTIVE", "INACTIVE"]);
var createBankAccountRequest = external_exports.object({
  holder_name: external_exports.string().trim().min(2).max(100),
  bank_name: external_exports.string().trim().min(2).max(100),
  ifsc: external_exports.string().trim().min(11).max(11),
  account_number: external_exports.string().trim().min(9).max(30)
});
var bankAccountProof = external_exports.object({
  file_name: external_exports.string(),
  content_type: external_exports.string(),
  size_bytes: external_exports.number().int()
});
var bankAccountView = external_exports.object({
  account_id: external_exports.string(),
  status: bankAccountStatus,
  holder_name: external_exports.string(),
  bank_name: external_exports.string(),
  ifsc: external_exports.string(),
  /** "••••1234" — the only form of the account number a seller (or any non-reveal read) ever sees. */
  account_number_masked: external_exports.string(),
  proof: bankAccountProof.nullable(),
  rejection_reason: external_exports.string().nullable(),
  verified_at: external_exports.string().nullable(),
  activated_at: external_exports.string().nullable(),
  created_at: external_exports.string()
});
var bankAccountResponse = external_exports.object({ account: bankAccountView, request_id: external_exports.string() });
var bankAccountListResponse = external_exports.object({ accounts: external_exports.array(bankAccountView), request_id: external_exports.string() });
var opsBankAccountView = bankAccountView.extend({
  seller_id: external_exports.string(),
  verified_by: external_exports.string().nullable()
});
var opsBankAccountListResponse = external_exports.object({ accounts: external_exports.array(opsBankAccountView), request_id: external_exports.string() });
var opsBankAccountResponse = external_exports.object({ account: opsBankAccountView, request_id: external_exports.string() });
var reviewBankAccountRequest = external_exports.object({
  decision: external_exports.enum(["APPROVE", "REJECT"]),
  reason: external_exports.string().trim().max(500).optional()
}).refine((v) => v.decision === "APPROVE" || v.reason != null && v.reason.length >= 3, {
  message: "A reason is required when rejecting an account.",
  path: ["reason"]
});
var revealedBankAccount = external_exports.object({
  holder_name: external_exports.string(),
  bank_name: external_exports.string(),
  ifsc: external_exports.string(),
  account_number: external_exports.string()
});
var revealedBankAccountResponse = external_exports.object({ account: revealedBankAccount, request_id: external_exports.string() });
var percent = external_exports.number().min(0).max(100).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, { message: "At most two decimal places." });
var commissionInput = external_exports.discriminatedUnion("type", [
  external_exports.object({ type: external_exports.literal("PERCENT"), percent }),
  external_exports.object({ type: external_exports.literal("FIXED"), amount_minor: external_exports.number().int().min(0) })
]);
var setPayoutConfigRequest = external_exports.object({
  commission: commissionInput,
  /** GST as a percentage of the commission (deducted from the seller's payout). */
  gst_percent: percent,
  note: external_exports.string().trim().max(500).optional(),
  /** Interim confirmation code (env) — replaced by an OTP later. Never logged or echoed. */
  confirmation_code: external_exports.string().min(1).max(200)
});
var payoutConfigView = external_exports.object({
  config_id: external_exports.string(),
  commission: external_exports.discriminatedUnion("type", [
    external_exports.object({ type: external_exports.literal("PERCENT"), percent: external_exports.number() }),
    external_exports.object({ type: external_exports.literal("FIXED"), amount_minor: external_exports.number().int() })
  ]),
  gst_percent: external_exports.number(),
  note: external_exports.string().nullable(),
  created_by: external_exports.string(),
  created_at: external_exports.string()
});
var payoutConfigResponse = external_exports.object({
  /** The rule currently in force, or null when none has been set (settlements wait, fail-closed). */
  current: payoutConfigView.nullable(),
  history: external_exports.array(payoutConfigView),
  request_id: external_exports.string()
});
var markSettlementPaidRequest = external_exports.object({
  /** The bank transfer reference / UTR. Required — it is the proof the payout happened, and unique. */
  bank_reference: external_exports.string().trim().min(6).max(40).regex(/^[A-Za-z0-9\-_/]+$/, "Letters, digits, - _ / only."),
  /** When the transfer was made (ISO). Defaults to now; may not be in the future. */
  paid_at: external_exports.string().datetime().optional(),
  note: external_exports.string().trim().max(500).optional()
});
var markSettlementFailedRequest = external_exports.object({ reason: external_exports.string().trim().min(3).max(500) });

// ../../packages/contracts/src/kyc.ts
var identityDocType = external_exports.enum(["AADHAAR", "PAN", "DRIVING_LICENCE"]);
var verificationStatus = external_exports.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]);
var verificationView = external_exports.object({
  verification_id: external_exports.string(),
  status: verificationStatus,
  doc_type: identityDocType,
  /** e.g. "XXXX XXXX 1234" (Aadhaar) or "••••234F" (PAN) — the only form of the number any read returns. */
  doc_masked: external_exports.string(),
  rejection_reason: external_exports.string().nullable(),
  submitted_at: external_exports.string(),
  reviewed_at: external_exports.string().nullable()
});
var verificationResponse = external_exports.object({
  verification: verificationView.nullable(),
  request_id: external_exports.string()
});
var opsVerificationView = verificationView.extend({
  user_id: external_exports.string(),
  reviewed_by: external_exports.string().nullable()
});
var opsVerificationListResponse = external_exports.object({
  verifications: external_exports.array(opsVerificationView),
  request_id: external_exports.string()
});
var opsVerificationResponse = external_exports.object({
  verification: opsVerificationView,
  request_id: external_exports.string()
});
var reviewVerificationRequest = external_exports.object({
  decision: external_exports.enum(["APPROVE", "REJECT"]),
  reason: external_exports.string().trim().max(500).optional()
}).refine((v) => v.decision === "APPROVE" || v.reason != null && v.reason.length >= 3, {
  message: "A reason is required when rejecting a verification.",
  path: ["reason"]
});
var revealedDocument = external_exports.object({ doc_type: identityDocType, doc_number: external_exports.string() });
var revealedDocumentResponse = external_exports.object({ document: revealedDocument, request_id: external_exports.string() });

// ../../packages/contracts/src/bookings.ts
var bookingMode = external_exports.enum(["DOORSTEP", "CENTRE"]);
var bookingStatus = external_exports.enum(["PENDING_PAYMENT", "REQUESTED", "ASSIGNED", "ON_SITE", "FULFILLED", "CANCELLED"]);
var bookingPreparation = external_exports.object({
  rc_present: external_exports.boolean(),
  open_space: external_exports.boolean(),
  keys_available: external_exports.boolean()
});
var bookingSlot = external_exports.object({
  slot_at: external_exports.string(),
  // ISO 8601
  available: external_exports.boolean()
});
var bookingSlotsResponse = external_exports.object({
  slots: external_exports.array(bookingSlot),
  /** The doorstep price, or null when booking is unavailable/unconfigured (fail-closed, not an error). */
  price: money.nullable(),
  request_id: external_exports.string()
});
var createBookingRequest = external_exports.object({
  vehicle_id: external_exports.string().nullable().optional(),
  valuation_id: external_exports.string().nullable().optional(),
  // the valuation the customer saw when booking (traceability)
  category: inspectionCategory,
  mode: bookingMode.optional(),
  // defaults to DOORSTEP
  address_line: external_exports.string().min(4).max(300),
  /** Flat / house / building — the exact unit, which a map pin + formatted address can't capture. */
  building: external_exports.string().max(200).nullable().optional(),
  /** Optional landmark to help the inspector find the spot ("near X mall"). */
  landmark: external_exports.string().max(200).nullable().optional(),
  pincode: external_exports.string().regex(/^\d{6}$/),
  city: marketplaceCity.nullable().optional(),
  geo_lat: external_exports.number().min(-90).max(90).nullable().optional(),
  geo_lng: external_exports.number().min(-180).max(180).nullable().optional(),
  slot_at: external_exports.string(),
  preparation: bookingPreparation.nullable().optional(),
  /**
   * DPDP inspection consent (Privacy Policy §6.4) plus the no-cancellation acknowledgement (Refund Policy §2.2):
   * the customer's explicit consent to the doorstep inspection and its evidence capture, and that the booking
   * cannot be cancelled once confirmed. Required (enforced at the route) and recorded in the audit log.
   */
  inspection_consent: external_exports.boolean().optional()
});
var assignBookingRequest = external_exports.object({
  inspector_id: external_exports.string().min(1).optional()
});
var bookingView = external_exports.object({
  booking_id: external_exports.string(),
  mode: bookingMode,
  category: inspectionCategory,
  status: bookingStatus,
  address_line: external_exports.string(),
  /** Flat / house / building (null if not provided). Shown to the inspector to find the exact unit. */
  building: external_exports.string().nullable(),
  /** Optional landmark (null if not provided). */
  landmark: external_exports.string().nullable(),
  pincode: external_exports.string(),
  city: marketplaceCity.nullable(),
  /** The exact map-pinned location (null if none) — what the inspector navigates to. */
  geo_lat: external_exports.number().nullable(),
  geo_lng: external_exports.number().nullable(),
  slot_at: external_exports.string(),
  price: money,
  /** Whether an inspector has been assigned (the inspector's identity is not exposed to the customer). */
  inspector_assigned: external_exports.boolean(),
  /** The valuation the customer saw when booking, for traceability (null if booked without one). */
  valuation_id: external_exports.string().nullable(),
  /** Set once the inspector completes the engine inspection linked to this booking. */
  inspection_id: external_exports.string().nullable(),
  /** Whether the doorstep fee has been paid (stamped by the verified payment webhook). */
  fee_paid: external_exports.boolean(),
  /** When the doorstep fee was captured (ISO), or null if unpaid — drives the receipt's paid date. */
  fee_paid_at: external_exports.string().nullable(),
  created_at: external_exports.string()
});
var bookingResponse = external_exports.object({ booking: bookingView, request_id: external_exports.string() });
var bookingListResponse = external_exports.object({ bookings: external_exports.array(bookingView), request_id: external_exports.string() });
var bookingMessage = external_exports.object({
  message_id: external_exports.string(),
  body: external_exports.string(),
  sender_is_me: external_exports.boolean(),
  created_at: external_exports.string()
});
var sendBookingMessageRequest = external_exports.object({ body: external_exports.string().trim().min(1).max(2e3) });
var bookingMessageResponse = external_exports.object({ message: bookingMessage, request_id: external_exports.string() });
var bookingMessageListResponse = external_exports.object({ messages: external_exports.array(bookingMessage), request_id: external_exports.string() });
var bookingQueueItem = bookingView.extend({
  inspector_id: external_exports.string().nullable()
});
var bookingQueueResponse = external_exports.object({ bookings: external_exports.array(bookingQueueItem), request_id: external_exports.string() });
var assignBookingResponse = external_exports.object({ booking: bookingQueueItem, request_id: external_exports.string() });

// ../../packages/contracts/src/organizations.ts
var organizationType = external_exports.enum(["LENDER", "DEALER", "YARD"]);
var organizationStatus = external_exports.enum(["PENDING", "ACTIVE", "SUSPENDED"]);
var organizationRole = external_exports.enum(["ADMIN", "MEMBER"]);
var createOrganizationRequest = external_exports.object({
  type: organizationType,
  legal_name: external_exports.string().min(1).max(200)
});
var organizationView = external_exports.object({
  id: external_exports.string(),
  type: organizationType,
  legal_name: external_exports.string(),
  status: organizationStatus,
  created_at: external_exports.string()
});
var createOrganizationResponse = external_exports.object({
  organization: organizationView,
  request_id: external_exports.string()
});
var listOrganizationsResponse = external_exports.object({
  organizations: external_exports.array(organizationView),
  request_id: external_exports.string()
});
var organizationResponse = external_exports.object({
  organization: organizationView,
  request_id: external_exports.string()
});
var setOrganizationStatusRequest = external_exports.object({
  status: external_exports.enum(["ACTIVE", "SUSPENDED"])
});
var addOrgMemberRequest = external_exports.object({
  user_id: external_exports.string().min(1),
  role: organizationRole
});
var orgMembershipView = external_exports.object({
  id: external_exports.string(),
  org_id: external_exports.string(),
  user_id: external_exports.string(),
  role: organizationRole,
  created_at: external_exports.string()
});
var addOrgMemberResponse = external_exports.object({
  membership: orgMembershipView,
  request_id: external_exports.string()
});
var changeOrgMemberRoleRequest = external_exports.object({ role: organizationRole });
var listOrgMembersResponse = external_exports.object({
  members: external_exports.array(orgMembershipView),
  request_id: external_exports.string()
});
var resolvedMembershipView = external_exports.object({
  membership_id: external_exports.string(),
  org_id: external_exports.string(),
  org_legal_name: external_exports.string(),
  org_type: organizationType,
  org_status: organizationStatus,
  role: organizationRole
});
var listMyOrganizationsResponse = external_exports.object({
  items: external_exports.array(resolvedMembershipView),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/dealer.ts
var dealerVehicleFacts = external_exports.object({
  category: external_exports.enum(["PASSENGER", "TWO_WHEELER"]),
  make: external_exports.string().trim().min(1).max(60),
  model: external_exports.string().trim().min(1).max(60),
  mfg_year: external_exports.number().int().min(1980).max(2100),
  fuel: external_exports.enum(["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"])
});
var createDealerListingRequest = external_exports.object({
  vehicle: dealerVehicleFacts,
  ask_price_minor: external_exports.number().int().positive(),
  city: external_exports.enum(["PUNE", "PCMC"]).nullable().optional(),
  note: external_exports.string().max(2e3).nullable().optional()
});
var dealerOrgListingView = external_exports.object({
  id: external_exports.string(),
  vehicle_id: external_exports.string(),
  status: external_exports.string(),
  ask_price_minor: external_exports.number().int(),
  currency: external_exports.string(),
  city: external_exports.string().nullable(),
  channel: external_exports.string(),
  created_at: external_exports.string(),
  published_at: external_exports.string().nullable()
});
var createDealerListingResponse = external_exports.object({ listing: dealerOrgListingView, request_id: external_exports.string() });
var listOrgListingsResponse = external_exports.object({ listings: external_exports.array(dealerOrgListingView), request_id: external_exports.string() });
var dealerListingSummary = external_exports.object({
  listing_id: external_exports.string(),
  make: external_exports.string(),
  model: external_exports.string(),
  variant: external_exports.string().nullable(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  category: external_exports.string(),
  city: external_exports.string().nullable(),
  ask_price_minor: external_exports.number().int(),
  currency: external_exports.string(),
  grade: external_exports.string().nullable(),
  status: external_exports.string(),
  published_at: external_exports.string().nullable()
});
var browseDealerListingsResponse = external_exports.object({
  listings: external_exports.array(dealerListingSummary),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/dealers.ts
var createDealerRequest = external_exports.object({
  email: external_exports.string().trim().min(3).max(254),
  mobile: external_exports.string().trim().min(8).max(20),
  password: external_exports.string().min(8).max(128),
  dealer_name: external_exports.string().trim().min(1).max(200)
});
var dealerCredentials = external_exports.object({
  user_id: external_exports.string(),
  org_id: external_exports.string(),
  email: external_exports.string(),
  mobile: external_exports.string(),
  password: external_exports.string(),
  dealer_name: external_exports.string(),
  /** Whether the welcome/reset email was actually dispatched (false when SMTP is off or the send failed). */
  email_sent: external_exports.boolean()
});
var createDealerResponse = external_exports.object({
  credentials: dealerCredentials,
  request_id: external_exports.string()
});
var dealerAccountView = external_exports.object({
  user_id: external_exports.string(),
  email: external_exports.string().nullable(),
  mobile: external_exports.string(),
  name: external_exports.string().nullable(),
  org_id: external_exports.string(),
  org_name: external_exports.string(),
  org_status: external_exports.enum(["PENDING", "ACTIVE", "SUSPENDED"]),
  created_at: external_exports.string()
});
var listDealersResponse = external_exports.object({
  dealers: external_exports.array(dealerAccountView),
  request_id: external_exports.string()
});
var resetDealerPasswordRequest = external_exports.object({
  password: external_exports.string().min(8).max(128)
});
var resetDealerPasswordResponse = external_exports.object({
  user_id: external_exports.string(),
  email: external_exports.string().nullable(),
  email_sent: external_exports.boolean(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/inspectors.ts
var grantInspectorRequest = external_exports.object({
  /** The E.164 phone of the user to make an inspector (e.g. "+919876543210"). Normalised server-side. */
  phone_e164: external_exports.string().min(4).max(20)
});
var inspectorView = external_exports.object({
  user_id: external_exports.string(),
  name: external_exports.string().nullable(),
  phone_masked: external_exports.string()
});
var grantInspectorResponse = external_exports.object({ inspector: inspectorView, request_id: external_exports.string() });
var listInspectorsResponse = external_exports.object({ inspectors: external_exports.array(inspectorView), request_id: external_exports.string() });

// ../../packages/contracts/src/institutional.ts
var documentCategory = external_exports.enum([
  "RC",
  "INSURANCE",
  "PUC",
  "SARFAESI_AUTHORITY",
  "POSSESSION_NOTICE",
  "NOC",
  "ID_PROOF",
  "OTHER"
]);
var intakeStatus = external_exports.enum(["REGISTERED", "IN_YARD", "RELEASED", "CANCELLED"]);
var documentView = external_exports.object({
  document_id: external_exports.string(),
  doc_type: documentCategory,
  valid_from: external_exports.string().nullable(),
  valid_until: external_exports.string().nullable(),
  verified_at: external_exports.string().nullable(),
  created_at: external_exports.string()
});
var possessionItemView = external_exports.object({
  item_id: external_exports.string(),
  label: external_exports.string(),
  media_id: external_exports.string().nullable(),
  note: external_exports.string().nullable(),
  created_at: external_exports.string()
});
var intakeRegistrationView = external_exports.object({
  intake_id: external_exports.string(),
  org_id: external_exports.string(),
  vehicle_id: external_exports.string().nullable(),
  m3_inspection_id: external_exports.string().nullable(),
  authority_doc_id: external_exports.string(),
  yard_placement_id: external_exports.string().nullable(),
  status: intakeStatus,
  documents: external_exports.array(documentView),
  possession_items: external_exports.array(possessionItemView),
  created_at: external_exports.string()
});
var intakeSummaryView = external_exports.object({
  intake_id: external_exports.string(),
  vehicle_id: external_exports.string().nullable(),
  status: intakeStatus,
  created_at: external_exports.string()
});
var intakeDocumentInput = external_exports.object({
  doc_type: documentCategory,
  /** The private object-storage key of the already-uploaded document (encrypted server-side at rest). */
  s3_key: external_exports.string().min(1).max(1024),
  valid_from: external_exports.string().nullable().optional(),
  valid_until: external_exports.string().nullable().optional()
});
var possessionItemInput = external_exports.object({
  label: external_exports.string().min(1).max(200),
  media_id: external_exports.string().nullable().optional(),
  note: external_exports.string().max(1e3).nullable().optional()
});
var registerIntakeRequest = external_exports.object({
  vehicle_id: external_exports.string().nullable().optional(),
  m3_inspection_id: external_exports.string().nullable().optional(),
  /** At least one document; a SARFAESI_AUTHORITY is mandatory (enforced server-side → INTAKE_DOCS_MISSING). */
  authority_documents: external_exports.array(intakeDocumentInput).min(1),
  possession_items: external_exports.array(possessionItemInput).optional()
});
var registerIntakeResponse = external_exports.object({ intake: intakeRegistrationView, request_id: external_exports.string() });
var getIntakeResponse = external_exports.object({ intake: intakeRegistrationView, request_id: external_exports.string() });
var listIntakeResponse = external_exports.object({ intake: external_exports.array(intakeSummaryView), request_id: external_exports.string() });
var placementStatus = external_exports.enum(["PLACED", "MOVED", "RELEASED"]);
var yardMovementView = external_exports.object({
  movement_id: external_exports.string(),
  from_bay: external_exports.string().nullable(),
  to_bay: external_exports.string().nullable(),
  reason: external_exports.string().nullable(),
  moved_at: external_exports.string()
});
var yardPlacementSummaryView = external_exports.object({
  placement_id: external_exports.string(),
  vehicle_id: external_exports.string().nullable(),
  yard_code: external_exports.string(),
  bay_code: external_exports.string().nullable(),
  status: placementStatus,
  /** Whole days in the yard (now − placed_at, or released_at − placed_at). A display value; NOT a ₹ cost. */
  storage_days: external_exports.number().int(),
  placed_at: external_exports.string()
});
var yardPlacementView = external_exports.object({
  placement_id: external_exports.string(),
  org_id: external_exports.string(),
  intake_id: external_exports.string().nullable(),
  vehicle_id: external_exports.string().nullable(),
  yard_code: external_exports.string(),
  bay_code: external_exports.string().nullable(),
  status: placementStatus,
  storage_days: external_exports.number().int(),
  placed_at: external_exports.string(),
  released_at: external_exports.string().nullable(),
  movements: external_exports.array(yardMovementView),
  created_at: external_exports.string()
});
var placeInYardRequest = external_exports.object({
  intake_id: external_exports.string().nullable().optional(),
  vehicle_id: external_exports.string().nullable().optional(),
  yard_code: external_exports.string().min(1).max(64),
  bay_code: external_exports.string().max(64).nullable().optional()
});
var moveYardRequest = external_exports.object({
  to_bay: external_exports.string().min(1).max(64),
  reason: external_exports.string().max(500).nullable().optional()
});
var releaseYardRequest = external_exports.object({
  reason: external_exports.string().max(500).nullable().optional()
});
var yardPlacementResponse = external_exports.object({ placement: yardPlacementView, request_id: external_exports.string() });
var listYardResponse = external_exports.object({ placements: external_exports.array(yardPlacementSummaryView), request_id: external_exports.string() });
var portfolioAgeingBucket = external_exports.enum(["FRESH", "AGEING", "STALE", "OLD"]);
var portfolioAssetKind = external_exports.enum(["LISTING"]);
var portfolioVehicleSummary = external_exports.object({
  make: external_exports.string(),
  model: external_exports.string(),
  mfg_year: external_exports.number().int(),
  fuel: external_exports.string(),
  category: external_exports.string(),
  /** Masked chassis (last 6) once vehicle identity is persisted (ADR-0019); null until then. */
  chassis_last6: external_exports.string().nullable()
});
var portfolioValuation = external_exports.object({ band: external_exports.string() });
var portfolioItemView = external_exports.object({
  asset_id: external_exports.string(),
  kind: portfolioAssetKind,
  vehicle: portfolioVehicleSummary,
  status: external_exports.string(),
  ageing_days: external_exports.number().int(),
  ageing_bucket: portfolioAgeingBucket,
  location: external_exports.string().nullable(),
  valuation: portfolioValuation.nullable(),
  channel: external_exports.string(),
  created_at: external_exports.string()
});
var getPortfolioResponse = external_exports.object({
  data: external_exports.array(portfolioItemView),
  next_cursor: external_exports.string().nullable(),
  request_id: external_exports.string()
});
var institutionalOrderStatus = external_exports.enum(["DRAFT", "AGREED", "CANCELLED", "PAID", "SETTLED", "COMPLETED"]);
var institutionalOrderView = external_exports.object({
  institutional_order_id: external_exports.string(),
  seller_org_id: external_exports.string(),
  buyer_org_id: external_exports.string(),
  listing_id: external_exports.string().nullable(),
  agreed_price_minor: external_exports.number().int().nullable(),
  currency: external_exports.string(),
  status: institutionalOrderStatus,
  created_at: external_exports.string()
});
var createInstitutionalOrderRequest = external_exports.object({
  seller_org_id: external_exports.string().min(1),
  listing_id: external_exports.string().nullable().optional(),
  agreed_price_minor: external_exports.number().int().positive().nullable().optional()
});
var institutionalOrderResponse = external_exports.object({ institutional_order: institutionalOrderView, request_id: external_exports.string() });
var listInstitutionalOrdersResponse = external_exports.object({ institutional_orders: external_exports.array(institutionalOrderView), request_id: external_exports.string() });

// ../../packages/contracts/src/lender-intake.ts
var bulkIntakeRowInput = external_exports.object({
  /** Registration number — the match/dedupe key for the REPO vehicle (spec §12.1). */
  reg_number: external_exports.string().min(1).max(32),
  /** Free-text asset description (e.g. "HONDA GRAZIA DLX LTD ED BSVI") — parsed to make/model when the
   * explicit make/model fields are absent. */
  asset: external_exports.string().max(120).optional(),
  /** Explicit make / model (override the parsed `asset`). */
  make: external_exports.string().max(60).optional(),
  model: external_exports.string().max(80).optional(),
  /** Fuel (e.g. PETROL / DIESEL / CNG / ELECTRIC / HYBRID) — normalised by the processor; required to create
   * the REPO vehicle (the sheet must carry it — the processor never fabricates a fuel). */
  fuel: external_exports.string().max(20).optional(),
  /** Raw segment from the sheet (e.g. "2W") — mapped to a vehicle category by the processor. */
  segment: external_exports.string().max(40).optional(),
  /** Year of manufacture. */
  yom: external_exports.coerce.number().int().min(1980).max(2100).optional(),
  /** Declared chassis/engine — stored ENCRYPTED, never verified here (§7.3), never returned in a view. */
  chassis: external_exports.string().max(40).optional(),
  engine: external_exports.string().max(40).optional(),
  /** Loan / hypothecation (HP) account reference + its date (recovery record, §7.1). */
  loan_account_ref: external_exports.string().max(64).optional(),
  hp_date: external_exports.string().max(40).optional(),
  /** Possession / repossession date (§7.1). */
  repo_date: external_exports.string().max(40).optional(),
  /** External (third-party, e.g. gaadi) inspection cert link — stored as a reference; extracted in Phase 13-E. */
  external_inspection_ref: external_exports.string().max(1024).optional(),
  /** Yard / parked location + a recovery contact — minimised metadata only. */
  yard: external_exports.string().max(160).optional(),
  contact: external_exports.string().max(120).optional(),
  note: external_exports.string().max(1e3).optional()
});
var MAX_CSV_BYTES = 5 * 1024 * 1024;
var createIntakeImportRequest = external_exports.object({
  filename: external_exports.string().min(1).max(255),
  csv_content: external_exports.string().min(1).max(MAX_CSV_BYTES),
  authority: external_exports.object({
    doc_type: documentCategory,
    s3_key: external_exports.string().min(1).max(1024)
  })
});
var intakeImportStatus = external_exports.enum([
  "PENDING_UPLOAD",
  "SUBMITTED",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "FAILED",
  "CANCELLED"
]);
var intakeImportRowStatus = external_exports.enum([
  "PENDING",
  "VALIDATED",
  "CREATED",
  "FAILED",
  "SKIPPED_DUPLICATE"
]);
var intakeImportJobView = external_exports.object({
  import_id: external_exports.string(),
  status: intakeImportStatus,
  filename: external_exports.string(),
  total_rows: external_exports.number().int().nonnegative(),
  created_count: external_exports.number().int().nonnegative(),
  failed_count: external_exports.number().int().nonnegative(),
  skipped_count: external_exports.number().int().nonnegative(),
  error_summary: external_exports.string().nullable(),
  created_at: external_exports.string(),
  submitted_at: external_exports.string().nullable(),
  completed_at: external_exports.string().nullable()
});
var intakeImportRowView = external_exports.object({
  row_number: external_exports.number().int().positive(),
  status: intakeImportRowStatus,
  reg_number: external_exports.string().nullable(),
  intake_id: external_exports.string().nullable(),
  vehicle_id: external_exports.string().nullable(),
  error_code: external_exports.string().nullable(),
  error_detail: external_exports.string().nullable()
});
var intakeImportResponse = external_exports.object({ import: intakeImportJobView, request_id: external_exports.string() });
var listIntakeImportsResponse = external_exports.object({
  imports: external_exports.array(intakeImportJobView),
  request_id: external_exports.string()
});
var listIntakeImportRowsResponse = external_exports.object({
  rows: external_exports.array(intakeImportRowView),
  next_cursor: external_exports.string().nullable(),
  request_id: external_exports.string()
});

// ../../packages/contracts/src/index.ts
var healthResponse = external_exports.object({
  status: external_exports.literal("ok"),
  service: external_exports.literal("turag"),
  version: external_exports.string()
});

// src/app/inspect/[id]/ai-finding.ts
var CONFIDENCE_REVIEW_FLOOR = 50;
var VALID_SEVERITIES2 = ["NONE", "MINOR", "MODERATE", "MAJOR", "CRITICAL"];
var COSMETIC_AREAS = ["PAINT", "LAMPS", "GLASS", "TYRES_WHEELS", "PANELS", "INTERIOR", "OTHER"];
var COSMETIC_SEVERITIES = ["MINOR", "MODERATE", "MAJOR"];
function toCosmetic(v2) {
  if (!Array.isArray(v2.cosmetic)) return [];
  const out = [];
  for (const e of v2.cosmetic.slice(0, 4)) {
    const area = typeof (e == null ? void 0 : e.area) === "string" ? e.area.trim().toUpperCase() : "";
    const severity2 = typeof (e == null ? void 0 : e.severity) === "string" ? e.severity.trim().toUpperCase() : "";
    const observation = typeof (e == null ? void 0 : e.observation) === "string" ? e.observation.trim().slice(0, 120) : "";
    if (!COSMETIC_AREAS.includes(area) || !COSMETIC_SEVERITIES.includes(severity2) || !observation) {
      continue;
    }
    out.push({
      area,
      observation,
      severity: severity2
    });
  }
  return out;
}
function buildAiFinding(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const { v2 } = input;
  const confidencePct = v2.confidence == null || !Number.isFinite(v2.confidence) ? 0 : Math.min(100, Math.max(0, Math.round(v2.confidence)));
  const severity2 = v2.severity != null && VALID_SEVERITIES2.includes(v2.severity) ? v2.severity : "NONE";
  const damageType = v2.type != null && DAMAGE_TYPE_VALUES.includes(v2.type.trim()) ? v2.type.trim() : "NONE";
  const modelExtra = input.modelBoxes && input.modelBoxes.length > 0 ? { model_detections: input.modelBoxes, detection_source: "vlm-v2" } : {};
  if (!v2.hasDamage) {
    return {
      shot_code: input.shotCode,
      has_damage: false,
      panel: ((_a = v2.part) == null ? void 0 : _a.trim()) ? v2.part.trim().slice(0, 40) : null,
      damage_type: "NONE",
      severity: "NONE",
      repair_or_replace: "NONE",
      repair_cost_minor: 0,
      repaint: false,
      confidence: confidencePct / 100,
      manual_review: confidencePct < CONFIDENCE_REVIEW_FLOOR,
      observation: ((_b = v2.reasoning) == null ? void 0 : _b.trim()) ? v2.reasoning.trim().slice(0, 280) : null,
      plate: ((_c = input.plate) == null ? void 0 : _c.trim()) ? input.plate.trim().slice(0, 20) : null,
      engine_version: ((_d = v2.promptVersion) == null ? void 0 : _d.trim()) || "unknown",
      analyzed_at: (_e = input.analyzedAt) != null ? _e : (/* @__PURE__ */ new Date()).toISOString(),
      cosmetic: toCosmetic(v2),
      ...modelExtra
    };
  }
  return {
    shot_code: input.shotCode,
    has_damage: true,
    panel: ((_f = v2.part) == null ? void 0 : _f.trim()) ? v2.part.trim().slice(0, 40) : null,
    damage_type: damageType,
    severity: severity2,
    repair_or_replace: severity2 === "MAJOR" || severity2 === "CRITICAL" ? "REPLACE" : "REPAIR",
    repair_cost_minor: Math.max(0, Math.floor((_g = v2.repairCostMinor) != null ? _g : 0)),
    repaint: false,
    confidence: confidencePct / 100,
    manual_review: confidencePct < CONFIDENCE_REVIEW_FLOOR,
    observation: ((_h = v2.reasoning) == null ? void 0 : _h.trim()) ? v2.reasoning.trim().slice(0, 280) : null,
    plate: ((_i = input.plate) == null ? void 0 : _i.trim()) ? input.plate.trim().slice(0, 20) : null,
    engine_version: ((_j = v2.promptVersion) == null ? void 0 : _j.trim()) || "unknown",
    analyzed_at: (_k = input.analyzedAt) != null ? _k : (/* @__PURE__ */ new Date()).toISOString(),
    cosmetic: toCosmetic(v2),
    ...modelExtra
  };
}
function findingToShotRead(finding) {
  return {
    shotCode: finding.shot_code,
    hasDamage: finding.has_damage,
    part: finding.panel,
    type: finding.damage_type,
    severity: finding.severity,
    confidence: finding.confidence,
    repairCostMinor: finding.repair_cost_minor,
    repaint: finding.repaint,
    uncertain: finding.manual_review
  };
}

// src/app/inspect/[id]/ai-decision.ts
var ANSWER_SEVERITIES = ["OK", "MINOR", "MODERATE", "MAJOR", "CRITICAL"];
function mapAiSeverityToAnswer(aiSeverity) {
  return aiSeverity != null && ANSWER_SEVERITIES.includes(aiSeverity) ? aiSeverity : "OK";
}
function buildMlSuggestion(input) {
  var _a, _b;
  const { finding, mediaId, decision } = input;
  return {
    engine_version: ((_a = finding.engine_version) == null ? void 0 : _a.trim()) || "unknown",
    analyzed_at: finding.analyzed_at,
    media_id: mediaId,
    shot_code: finding.shot_code,
    part: finding.panel,
    damage_type: finding.damage_type,
    severity: finding.severity,
    confidence: finding.confidence,
    repair_cost_minor: finding.repair_cost_minor,
    decision,
    decided_at: (_b = input.decidedAt) != null ? _b : (/* @__PURE__ */ new Date()).toISOString()
  };
}
function decideForSavedSeverity(input) {
  const { finding, mediaId, finalSeverity, forcedVerdict } = input;
  const aiAnswer = mapAiSeverityToAnswer(finding.has_damage ? finding.severity : "NONE");
  const decision = forcedVerdict != null ? forcedVerdict : finalSeverity === aiAnswer ? "CONFIRMED" : "OVERRIDDEN";
  return {
    inspector_override: true,
    ml_suggestion: buildMlSuggestion({ finding, mediaId, decision, decidedAt: input.decidedAt })
  };
}
function newestFindingFor(persisted, shotCodes) {
  let best = null;
  for (const shot of shotCodes) {
    const entry = persisted[shot];
    if (!entry) continue;
    if (!best || entry.finding.analyzed_at > best.finding.analyzed_at) best = entry;
  }
  return best;
}

// src/app/inspect/[id]/wizard-steps.ts
var WIZARD_PHOTO_STEPS = [
  { kind: "PHOTO", questionId: "vehicle_front", itemCode: "B1", shotCode: "WALK_FRONT", prompt: "Front side ki photo upload karein" },
  { kind: "PHOTO", questionId: "front_left_corner", itemCode: "B1", shotCode: "WALK_FRONT_LEFT", prompt: "Front-left corner ki photo upload karein" },
  { kind: "PHOTO", questionId: "vehicle_left", itemCode: "B1", shotCode: "WALK_LEFT", prompt: "Left side ki photo upload karein" },
  { kind: "PHOTO", questionId: "rear_left_corner", itemCode: "B1", shotCode: "WALK_REAR_LEFT", prompt: "Rear-left corner ki photo upload karein" },
  { kind: "PHOTO", questionId: "vehicle_back", itemCode: "B1", shotCode: "WALK_REAR", prompt: "Back side ki photo upload karein" },
  { kind: "PHOTO", questionId: "rear_right_corner", itemCode: "B1", shotCode: "WALK_REAR_RIGHT", prompt: "Rear-right corner ki photo upload karein" },
  { kind: "PHOTO", questionId: "vehicle_right", itemCode: "B1", shotCode: "WALK_RIGHT", prompt: "Right side ki photo upload karein" },
  { kind: "PHOTO", questionId: "front_right_corner", itemCode: "B1", shotCode: "WALK_FRONT_RIGHT", prompt: "Front-right corner ki photo upload karein" },
  { kind: "PHOTO", questionId: "vin", itemCode: "A1", shotCode: "VIN_PLATE", prompt: "Chassis/VIN number ki photo upload karein" },
  { kind: "PHOTO", questionId: "engine_number", itemCode: "A1", shotCode: "ENGINE_NUMBER", prompt: "Engine number ki photo upload karein" },
  { kind: "PHOTO", questionId: "rc_front", itemCode: "P2", shotCode: "RC_FRONT", prompt: "RC ki photo upload karein \u2014 first page" },
  { kind: "PHOTO", questionId: "rc_back", itemCode: "P1", shotCode: "RC_BACK", prompt: "RC book second page ki photo upload karein" },
  { kind: "PHOTO", questionId: "odometer", itemCode: "O1", shotCode: "ODOMETER", prompt: "Odometer ki photo upload karein" },
  { kind: "PHOTO", questionId: "insurance", itemCode: "P3", shotCode: "INSURANCE_POLICY", prompt: "Insurance document ki photo upload karein" },
  { kind: "PHOTO", questionId: "puc", itemCode: "P4", shotCode: "PUC_CERT", prompt: "PUC certificate ki photo upload karein" },
  { kind: "PHOTO", questionId: "tyre_fl", itemCode: "H1", shotCode: "TYRE_FL", prompt: "Front-left tyre ki photo upload karein" },
  { kind: "PHOTO", questionId: "tyre_fr", itemCode: "H1", shotCode: "TYRE_FR", prompt: "Front-right tyre ki photo upload karein" },
  { kind: "PHOTO", questionId: "tyre_rl", itemCode: "H1", shotCode: "TYRE_RL", prompt: "Rear-left tyre ki photo upload karein" },
  { kind: "PHOTO", questionId: "tyre_rr", itemCode: "H1", shotCode: "TYRE_RR", prompt: "Rear-right tyre ki photo upload karein" },
  { kind: "PHOTO", questionId: "dashboard", itemCode: "K1", shotCode: "DASHBOARD", prompt: "Dashboard ki photo upload karein" },
  { kind: "PHOTO", questionId: "front_interior", itemCode: "K1", shotCode: "SEATS", prompt: "Front interior / seats ki photo upload karein" },
  { kind: "PHOTO", questionId: "rear_interior", itemCode: "K1", shotCode: "SEATS_REAR", prompt: "Rear interior ki photo upload karein" },
  { kind: "PHOTO", questionId: "engine_bay", itemCode: "D1", shotCode: "ENGINE_BAY", prompt: "Engine bay ki photo upload karein" }
];

// src/app/inspect/[id]/review-readiness.ts
function b1WalkaroundShots() {
  return WIZARD_PHOTO_STEPS.filter((p) => p.itemCode === "B1").map((p) => p.shotCode);
}

// src/app/inspect/[id]/angle-findings.ts
var VALID_SEVERITIES3 = ["NONE", "MINOR", "MODERATE", "MAJOR", "CRITICAL"];
function toSeverity2(raw) {
  return raw != null && VALID_SEVERITIES3.includes(raw) ? raw : "NONE";
}
function toDamageType(raw) {
  return raw != null && DAMAGE_TYPE_VALUES.includes(raw) ? raw : null;
}
function toConfidence(raw) {
  if (raw == null || !Number.isFinite(raw)) return 0;
  const v = raw <= 1 ? raw : raw / 100;
  return Math.min(1, Math.max(0, v));
}
function collectAngleFindings(reads) {
  var _a, _b, _c;
  const validShots = new Set(b1WalkaroundShots());
  const findings = [];
  const warnings = [];
  for (const read of reads) {
    if (!validShots.has(read.shotCode)) {
      warnings.push(`Ignoring read for unknown angle ${read.shotCode}.`);
      continue;
    }
    const panel = (_b = (_a = read.part) == null ? void 0 : _a.trim()) != null ? _b : "";
    if (read.hasDamage && panel === "") {
      warnings.push(`Ignoring ${read.shotCode} read: damage reported without a panel.`);
      continue;
    }
    if (!read.hasDamage) {
      findings.push({
        angle: read.shotCode,
        panel: panel || "UNASSESSED",
        damageType: "NONE",
        severity: "NONE",
        repairOrReplace: "NONE",
        repairCostMinor: 0,
        repaint: read.repaint === true,
        confidence: toConfidence(read.confidence),
        manualReview: read.uncertain === true
      });
      continue;
    }
    const type = toDamageType(read.type);
    if (type == null || type === "NONE") {
      warnings.push(`Ignoring ${read.shotCode} read: unknown damage type.`);
      continue;
    }
    const severity2 = toSeverity2(read.severity);
    findings.push({
      angle: read.shotCode,
      panel,
      damageType: type,
      severity: severity2,
      repairOrReplace: severity2 === "MAJOR" || severity2 === "CRITICAL" ? "REPLACE" : "REPAIR",
      repairCostMinor: Math.max(0, Math.floor((_c = read.repairCostMinor) != null ? _c : 0)),
      repaint: read.repaint === true,
      confidence: toConfidence(read.confidence),
      manualReview: read.uncertain === true || read.confidence == null
    });
  }
  return { findings, warnings };
}

// src/app/inspect/[id]/cross-validate.ts
function normalizeIdentityCode(raw) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function normalizeName(raw) {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}
function present(value) {
  return value != null && value.trim() !== "";
}
function compareNames(a, b, uncertain = false) {
  if (!present(a) || !present(b)) return "NOT_AVAILABLE";
  if (uncertain) return "NEEDS_MANUAL_REVIEW";
  return normalizeName(a) === normalizeName(b) ? "MATCH" : "MISMATCH";
}
function compareRegistration(reads, uncertain = false) {
  const values = reads.filter(present);
  if (values.length < 2) return "NOT_AVAILABLE";
  if (uncertain) return "NEEDS_MANUAL_REVIEW";
  const first = normalizeIdentityCode(values[0]);
  return values.every((v) => normalizeIdentityCode(v) === first) ? "MATCH" : "MISMATCH";
}
function collect(sources, keys) {
  const out = [];
  for (const src of sources) {
    if (!src) continue;
    for (const k of keys) {
      const v = src[k];
      out.push(v == null ? null : String(v));
    }
  }
  return out;
}
function crossValidateVehicle(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const uncertain = new Set((_a = input.uncertain) != null ? _a : []);
  const vinReads = collect(
    [input.rc, input.vinPhoto, input.vehicle],
    ["vin", "chassisNumber", "chassis_number", "chassis_last6"]
  );
  const vinFullReads = collect(
    [input.rc, input.vinPhoto, input.vehicle],
    ["vin", "chassisNumber", "chassis_number"]
  );
  const hasLast6Only = vinFullReads.every((v) => !present(v)) && vinReads.some((v) => present(v));
  const engineReads = collect(
    [input.rc, input.vinPhoto, input.vehicle],
    ["engineNumber", "engine_number"]
  );
  const regReads = [
    (_e = (_d = (_b = input.rc) == null ? void 0 : _b.registrationNumber) != null ? _d : (_c = input.rc) == null ? void 0 : _c.registration_number) != null ? _e : null,
    (_f = input.frontPlate) != null ? _f : null,
    (_g = input.rearPlate) != null ? _g : null
  ];
  const uncertainIn = (keys) => keys.some((k) => uncertain.has(k));
  const allAgree = (reads, cmp) => {
    const values = reads.filter(present);
    return values.every((v) => cmp(values[0], v));
  };
  const vinVerdict = (() => {
    if (hasLast6Only) return "NEEDS_MANUAL_REVIEW";
    const values = vinFullReads.filter(present);
    if (values.length < 2) return "NOT_AVAILABLE";
    if (uncertainIn(["vin", "chassisNumber", "chassis_number", "chassis_last6"]))
      return "NEEDS_MANUAL_REVIEW";
    return allAgree(values, (a, b) => normalizeIdentityCode(a) === normalizeIdentityCode(b)) ? "MATCH" : "MISMATCH";
  })();
  const engineValues = engineReads.filter(present);
  const registrationVerdict = compareRegistration(
    regReads,
    uncertainIn(["registrationNumber", "registration_number", "frontPlate", "rearPlate"])
  );
  const rcMake = (_h = collect([input.rc], ["make"]).find(present)) != null ? _h : null;
  const vehMake = (_i = collect([input.vehicle], ["make"]).find(present)) != null ? _i : null;
  const rcModel = (_j = collect([input.rc], ["model"]).find(present)) != null ? _j : null;
  const vehModel = (_k = collect([input.vehicle], ["model"]).find(present)) != null ? _k : null;
  const rcVariant = (_l = collect([input.rc], ["variant"]).find(present)) != null ? _l : null;
  const vehVariant = (_m = collect([input.vehicle], ["variant"]).find(present)) != null ? _m : null;
  const engineVerdict = (() => {
    if (engineValues.length < 2) return "NOT_AVAILABLE";
    if (uncertainIn(["engineNumber", "engine_number"])) return "NEEDS_MANUAL_REVIEW";
    return allAgree(engineValues, (a, b) => normalizeIdentityCode(a) === normalizeIdentityCode(b)) ? "MATCH" : "MISMATCH";
  })();
  const variantVerdict = (() => {
    if (!present(rcVariant) || !present(vehVariant)) return "NOT_AVAILABLE";
    if (uncertainIn(["variant"])) return "NEEDS_MANUAL_REVIEW";
    return normalizeName(rcVariant) === normalizeName(vehVariant) ? "MATCH" : "MISMATCH";
  })();
  return {
    vin: { verdict: vinVerdict },
    engineNumber: { verdict: engineVerdict },
    registrationNumber: { verdict: registrationVerdict },
    make: {
      verdict: compareNames(rcMake, vehMake, uncertainIn(["make"]))
    },
    model: {
      verdict: compareNames(rcModel, vehModel, uncertainIn(["model"]))
    },
    variant: { verdict: variantVerdict }
  };
}

// src/app/inspect/[id]/vehicle-profile.ts
var IMPORTANT_FIELDS = ["make", "model", "variant"];
function buildCanonicalProfile(input) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w;
  const conflicts = [];
  const warnings = [];
  for (const field of IMPORTANT_FIELDS) {
    const verdict = verdictFor(input.verdicts, field);
    if (verdict === "MISMATCH") {
      const values = [input.vehicle[field], (_b = (_a = input.rc) == null ? void 0 : _a[field]) != null ? _b : null].filter(
        (v) => v != null && String(v).trim() !== ""
      );
      conflicts.push({ field, values: [...new Set(values.map((v) => v.trim()))] });
    }
  }
  const vehYear = input.vehicle.mfgYear;
  const rcYear = input.rcMfgYear;
  if (vehYear != null && rcYear != null && vehYear !== rcYear) {
    conflicts.push({ field: "mfgYear", values: [String(vehYear), String(rcYear)] });
  }
  if (conflicts.length > 0) {
    return {
      status: "NEEDS_MANUAL_REVIEW",
      profile: null,
      conflicts,
      warnings: ["Identity sources conflict \u2014 resolve manually; originals preserved."],
      saleCity: (_c = input.saleCity) != null ? _c : null,
      inspectionCity: (_d = input.inspectionCity) != null ? _d : null
    };
  }
  const make = (_f = (_e = input.vehicle.make) == null ? void 0 : _e.trim()) != null ? _f : "";
  const model = (_h = (_g = input.vehicle.model) == null ? void 0 : _g.trim()) != null ? _h : "";
  const mfgYear = (_i = vehYear != null ? vehYear : rcYear) != null ? _i : null;
  const base = (_j = input.vehicle.baseExShowroomMinor) != null ? _j : null;
  if (!make || !model || mfgYear == null || base == null || base <= 0) {
    const missing = [
      !make ? "make" : null,
      !model ? "model" : null,
      mfgYear == null ? "manufacturing year" : null,
      base == null || base <= 0 ? "ex-showroom reference" : null
    ].filter((x) => x != null);
    return {
      status: "NEEDS_MANUAL_REVIEW",
      profile: null,
      conflicts: [],
      warnings: [`Vehicle identity is incomplete (${missing.join(", ")}) \u2014 no price computed.`],
      saleCity: (_k = input.saleCity) != null ? _k : null,
      inspectionCity: (_l = input.inspectionCity) != null ? _l : null
    };
  }
  const corroborated = verdictFor(input.verdicts, "make") === "MATCH" || verdictFor(input.verdicts, "model") === "MATCH";
  if (!corroborated) {
    warnings.push("Identity is single-source (uncorroborated) \u2014 price confidence is capped.");
  }
  const variant = ((_m = input.vehicle.variant) == null ? void 0 : _m.trim()) || ((_o = (_n = input.rc) == null ? void 0 : _n.variant) == null ? void 0 : _o.trim()) || null;
  const profile = {
    make,
    model,
    variant,
    category: (_p = input.vehicle.category) != null ? _p : "PASSENGER",
    fuel: ((_q = input.vehicle.fuel) == null ? void 0 : _q.trim()) || null,
    mfgYear,
    ageYears: (_r = input.vehicle.ageYears) != null ? _r : 0,
    odometerKm: (_s = input.odometerKm) != null ? _s : null,
    previousOwners: (_t = input.previousOwners) != null ? _t : null,
    baseExShowroomMinor: base,
    segmentTier: (_u = input.vehicle.segmentTier) != null ? _u : "BUDGET",
    modelKey: `${make} ${model}`.trim()
  };
  return {
    status: "READY",
    profile,
    conflicts: [],
    warnings,
    saleCity: (_v = input.saleCity) != null ? _v : null,
    inspectionCity: (_w = input.inspectionCity) != null ? _w : null
  };
}
function verdictFor(v, field) {
  return field === "make" ? v.make.verdict : field === "model" ? v.model.verdict : v.variant.verdict;
}

// ../../packages/core/src/modules/valuation/domain/config.ts
var VALUATION_MODEL_VERSION = "val-dev-0";
var CATEGORY_CURVES = {
  PASSENGER: { firstYearRetention: 0.85, annualRetention: 0.86, floor: 0.1, avgAnnualKm: 1e4 },
  TWO_WHEELER: { firstYearRetention: 0.8, annualRetention: 0.85, floor: 0.08, avgAnnualKm: 6e3 }
};
var CONDITION_ADJUSTMENT_PCT = {
  EXCELLENT: 4,
  GOOD: 0,
  FAIR: -5,
  POOR: -12
};
function ownerAdjustmentPct(ownerCount) {
  if (ownerCount <= 1) return 3;
  if (ownerCount === 2) return 0;
  if (ownerCount === 3) return -3;
  return -6;
}
var ODOMETER_PENALTY_PER_RATIO = 10;
var ODOMETER_MIN_PCT = -15;
var ODOMETER_MAX_PCT = 8;
var BAND_MULTIPLIERS = { distress: 0.82, auction: 0.9, tradeIn: 1, retail: 1.14 };
var STAGE_HALF_WIDTH = { INSTANT: 0.12, DECLARED: 0.07 };
var CONFIDENCE_BY_STAGE = {
  INSTANT: { level: "LOW", score: 0.35 },
  DECLARED: { level: "MEDIUM", score: 0.6 }
};

// ../../packages/core/src/modules/valuation/domain/depreciation.ts
function retentionFactor(curve, ageYears) {
  if (ageYears <= 0) return 1;
  let factor = curve.firstYearRetention;
  for (let year = 1; year < ageYears; year++) {
    factor *= curve.annualRetention;
  }
  return Math.max(factor, curve.floor);
}
function baseResidualMinor(baseExShowroomMinor, curve, ageYears) {
  return Math.round(baseExShowroomMinor * retentionFactor(curve, ageYears));
}

// ../../packages/core/src/modules/valuation/domain/adjustments.ts
function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}
function round1(value) {
  return Math.round(value * 10) / 10 + 0;
}
function expectedKm(avgAnnualKm, ageYears) {
  return Math.max(0, ageYears) * avgAnnualKm;
}
function odometerAdjustment(odometerKm, expectedKmValue) {
  if (expectedKmValue <= 0) return null;
  const ratio = odometerKm / expectedKmValue;
  const impactPct = round1(clamp(-(ratio - 1) * ODOMETER_PENALTY_PER_RATIO, ODOMETER_MIN_PCT, ODOMETER_MAX_PCT));
  return { factor: "odometer_vs_expected", impactPct, detail: `${odometerKm} km vs ${expectedKmValue} expected` };
}
function ownerAdjustment(ownerCount) {
  if (ownerCount < 1) return null;
  return {
    factor: "owner_count",
    impactPct: ownerAdjustmentPct(ownerCount),
    detail: ownerCount >= 4 ? "4+ owners" : `${ownerCount} owner${ownerCount === 1 ? "" : "s"}`
  };
}
function conditionAdjustment(condition) {
  return { factor: "declared_condition", impactPct: CONDITION_ADJUSTMENT_PCT[condition], detail: condition };
}

// ../../packages/core/src/modules/valuation/domain/bands.ts
function roundTo100Rupees(minor) {
  return Math.round(minor / 1e4) * 1e4;
}
function computeBands(centralMinor, halfWidth) {
  const band4 = (multiplier) => {
    const mid = centralMinor * multiplier;
    return {
      low: roundTo100Rupees(mid * (1 - halfWidth)),
      high: roundTo100Rupees(mid * (1 + halfWidth))
    };
  };
  return {
    distress: band4(BAND_MULTIPLIERS.distress),
    auction: band4(BAND_MULTIPLIERS.auction),
    tradeIn: band4(BAND_MULTIPLIERS.tradeIn),
    retail: band4(BAND_MULTIPLIERS.retail)
  };
}
function headlineMinor(centralMinor) {
  return roundTo100Rupees(centralMinor * BAND_MULTIPLIERS.tradeIn);
}

// ../../packages/core/src/modules/valuation/domain/safety-bounds.ts
var DEFAULT_SAFETY_BOUNDS = {
  scrapFloorPct: 0.05,
  absoluteFloorMinor: 25e5,
  // ₹25,000
  ceilingPct: 1.05
  // Cannot exceed 105% of ex-showroom
};
function applyPriceSafetyBounds(rawPriceMinor, baseExShowroomMinor, config = DEFAULT_SAFETY_BOUNDS) {
  const floorByPct = Math.round(baseExShowroomMinor * config.scrapFloorPct);
  const minFloor = Math.max(floorByPct, config.absoluteFloorMinor);
  const maxCeiling = Math.round(baseExShowroomMinor * config.ceilingPct);
  if (rawPriceMinor < minFloor) {
    return {
      rawMinor: rawPriceMinor,
      boundedMinor: minFloor,
      clamped: true,
      reason: "FLOOR_APPLIED"
    };
  }
  if (rawPriceMinor > maxCeiling) {
    return {
      rawMinor: rawPriceMinor,
      boundedMinor: maxCeiling,
      clamped: true,
      reason: "CEILING_APPLIED"
    };
  }
  return {
    rawMinor: rawPriceMinor,
    boundedMinor: rawPriceMinor,
    clamped: false
  };
}

// ../../packages/core/src/modules/valuation/domain/valuation-explainability.ts
function buildValuationExplanation(baseResidualMinor2, finalCentralMinor, adjustments) {
  const totalAdjustmentMinor = finalCentralMinor - baseResidualMinor2;
  const totalAdjustmentPct = baseResidualMinor2 > 0 ? Math.round(totalAdjustmentMinor / baseResidualMinor2 * 1e3) / 10 : 0;
  const positiveDrivers = [];
  const negativeDrivers = [];
  for (const adj of adjustments) {
    const impactMinor = Math.round(baseResidualMinor2 * (adj.impactPct / 100));
    const isPos = adj.impactPct > 0;
    const isNeg = adj.impactPct < 0;
    let nameEn = adj.factor;
    let nameHi = adj.factor;
    let explanationEn = adj.detail || `Impact: ${adj.impactPct}%`;
    let explanationHi = `\u092A\u094D\u0930\u092D\u093E\u0935: ${adj.impactPct}%`;
    switch (adj.factor) {
      case "ODOMETER":
        nameEn = "Kilometers Driven";
        nameHi = "\u091A\u0932\u093E\u090F \u0917\u090F \u0915\u093F\u0932\u094B\u092E\u0940\u091F\u0930";
        if (isPos) {
          explanationEn = `Lower than expected mileage boosted value (+${adj.impactPct}%).`;
          explanationHi = `\u0914\u0938\u0924 \u0938\u0947 \u0915\u092E \u0915\u093F\u0932\u094B\u092E\u0940\u091F\u0930 \u091A\u0932\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0915\u0940\u092E\u0924 \u092E\u0947\u0902 \u092C\u0922\u093C\u094B\u0924\u0930\u0940 (+${adj.impactPct}%).`;
        } else {
          explanationEn = `Higher than benchmark mileage depreciated value (${adj.impactPct}%).`;
          explanationHi = `\u0914\u0938\u0924 \u0938\u0947 \u0905\u0927\u093F\u0915 \u091A\u0932\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0915\u0940\u092E\u0924 \u092E\u0947\u0902 \u0915\u092E\u0940 (${adj.impactPct}%).`;
        }
        break;
      case "OWNERS":
        nameEn = "Previous Ownership";
        nameHi = "\u092E\u093E\u0932\u093F\u0915\u094B\u0902 \u0915\u0940 \u0938\u0902\u0916\u094D\u092F\u093E";
        if (isNeg) {
          explanationEn = `Multiple previous owners reduced resale appeal (${adj.impactPct}%).`;
          explanationHi = `\u090F\u0915 \u0938\u0947 \u0905\u0927\u093F\u0915 \u092E\u093E\u0932\u093F\u0915 \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u092A\u0941\u0928\u0930\u094D\u0935\u093F\u0915\u094D\u0930\u092F \u092E\u0942\u0932\u094D\u092F \u092E\u0947\u0902 \u0915\u092E\u0940 (${adj.impactPct}%).`;
        }
        break;
      case "CONDITION":
        nameEn = "Declared Condition";
        nameHi = "\u0918\u094B\u0937\u093F\u0924 \u0935\u093E\u0939\u0928 \u0938\u094D\u0925\u093F\u0924\u093F";
        if (isPos) {
          explanationEn = `Well-maintained condition rating added value premium (+${adj.impactPct}%).`;
          explanationHi = `\u0909\u0924\u094D\u0915\u0943\u0937\u094D\u091F \u0930\u0916\u0930\u0916\u093E\u0935 \u0915\u0947 \u0915\u093E\u0930\u0923 \u092A\u094D\u0930\u0940\u092E\u093F\u092F\u092E \u092E\u0942\u0932\u094D\u092F (+${adj.impactPct}%).`;
        } else {
          explanationEn = `Visible wear or repair needs lowered baseline rating (${adj.impactPct}%).`;
          explanationHi = `\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u091F\u0942\u091F-\u092B\u0942\u091F \u0914\u0930 \u092E\u0930\u092E\u094D\u092E\u0924 \u0915\u0940 \u0906\u0935\u0936\u094D\u092F\u0915\u0924\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u091B\u0942\u091F (${adj.impactPct}%).`;
        }
        break;
      default:
        break;
    }
    const item = {
      factor: adj.factor,
      nameEn,
      nameHi,
      impactPct: adj.impactPct,
      impactMinor,
      type: isPos ? "POSITIVE" : isNeg ? "NEGATIVE" : "NEUTRAL",
      explanationEn,
      explanationHi
    };
    if (isPos) {
      positiveDrivers.push(item);
    } else if (isNeg) {
      negativeDrivers.push(item);
    }
  }
  const posCount = positiveDrivers.length;
  const negCount = negativeDrivers.length;
  const summaryEn = `Valuation calculated based on base age depreciation with ${posCount} positive factor(s) and ${negCount} deduction factor(s).`;
  const summaryHi = `\u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0935\u093E\u0939\u0928 \u0915\u0940 \u0906\u092F\u0941 \u092A\u0930 \u0906\u0927\u093E\u0930\u093F\u0924 \u0939\u0948, \u091C\u093F\u0938\u092E\u0947\u0902 ${posCount} \u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0915\u093E\u0930\u0915 \u0914\u0930 ${negCount} \u0915\u091F\u094C\u0924\u0940 \u0915\u093E\u0930\u0915 \u0936\u093E\u092E\u093F\u0932 \u0939\u0948\u0902\u0964`;
  return {
    baseResidualMinor: baseResidualMinor2,
    finalCentralMinor,
    totalAdjustmentMinor,
    totalAdjustmentPct,
    positiveDrivers,
    negativeDrivers,
    summaryEn,
    summaryHi
  };
}

// ../../packages/core/src/modules/valuation/domain/odometer-tampering.ts
function detectOdometerAnomaly(odometerKm, ageYears, category) {
  const effectiveAge = Math.max(0.5, ageYears);
  const annualKm = Math.round(odometerKm / effectiveAge);
  const benchmark = category === "TWO_WHEELER" ? { minAnnual: 3e3, maxAnnual: 18e3, suspiciousLow: 1500, suspiciousHigh: 3e4 } : { minAnnual: 5e3, maxAnnual: 25e3, suspiciousLow: 2500, suspiciousHigh: 45e3 };
  const flags = [];
  let score = 0;
  if (ageYears >= 3 && annualKm < benchmark.suspiciousLow) {
    flags.push("UNREASONABLY_LOW_KM");
    score += Math.min(60, Math.round((benchmark.suspiciousLow - annualKm) / benchmark.suspiciousLow * 60));
  }
  if (ageYears >= 5 && odometerKm < 15e3) {
    flags.push("SUSPICIOUS_LIFETIME_ODOMETER");
    score += 30;
  }
  if (annualKm > benchmark.suspiciousHigh) {
    flags.push("EXCESSIVE_ANNUAL_WEAR");
    score += Math.min(40, Math.round((annualKm - benchmark.suspiciousHigh) / benchmark.suspiciousHigh * 40));
  }
  const anomalyScore = Math.min(100, Math.max(0, score));
  let riskLevel = "LOW";
  let recommendationEn = "Odometer reading appears consistent with typical vehicle usage.";
  let recommendationHi = "\u0913\u0921\u094B\u092E\u0940\u091F\u0930 \u0930\u0940\u0921\u093F\u0902\u0917 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0935\u093E\u0939\u0928 \u0909\u092A\u092F\u094B\u0917 \u0915\u0947 \u0905\u0928\u0941\u0930\u0942\u092A \u092A\u094D\u0930\u0924\u0940\u0924 \u0939\u094B\u0924\u0940 \u0939\u0948\u0964";
  if (anomalyScore >= 60) {
    riskLevel = "HIGH_RISK";
    recommendationEn = "High probability of odometer rollback or tampering. Require service history verification.";
    recommendationHi = "\u0913\u0921\u094B\u092E\u0940\u091F\u0930 \u092E\u0940\u091F\u0930 \u092E\u0947\u0902 \u091B\u0947\u0921\u093C\u091B\u093E\u0921\u093C \u092F\u093E \u0930\u0940\u0938\u0947\u091F \u0915\u0940 \u0909\u091A\u094D\u091A \u0938\u0902\u092D\u093E\u0935\u0928\u093E \u0939\u0948\u0964 \u0938\u0930\u094D\u0935\u093F\u0938 \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0915\u0940 \u091C\u093E\u0902\u091A \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964";
  } else if (anomalyScore >= 30) {
    riskLevel = "SUSPICIOUS";
    recommendationEn = "Unusual mileage pattern detected. Physical pedal and tyre wear cross-inspection recommended.";
    recommendationHi = "\u0905\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0915\u093F\u0932\u094B\u092E\u0940\u091F\u0930 \u092A\u0948\u091F\u0930\u094D\u0928\u0964 \u092A\u0947\u0921\u0932 \u0914\u0930 \u091F\u093E\u092F\u0930 \u0915\u0940 \u0938\u094D\u0925\u093F\u0924\u093F \u0915\u0940 \u092D\u094C\u0924\u093F\u0915 \u091C\u093E\u0902\u091A \u0915\u0940 \u0938\u093F\u092B\u093E\u0930\u093F\u0936 \u0915\u0940 \u091C\u093E\u0924\u0940 \u0939\u0948\u0964";
  }
  return {
    odometerKm,
    ageYears,
    calculatedAnnualKm: annualKm,
    expectedAnnualMinKm: benchmark.minAnnual,
    expectedAnnualMaxKm: benchmark.maxAnnual,
    riskLevel,
    anomalyScore,
    flags,
    recommendationEn,
    recommendationHi
  };
}

// ../../packages/core/src/modules/valuation/domain/panels.ts
var PANEL_GROUPS = {
  PASSENGER: [
    "FRONT_BUMPER",
    "REAR_BUMPER",
    "FRONT_FENDER_L",
    "FRONT_FENDER_R",
    "HOOD",
    "BOOT_LID",
    "ROOF",
    "FRONT_DOOR_L",
    "FRONT_DOOR_R",
    "REAR_DOOR_L",
    "REAR_DOOR_R",
    "QUARTER_PANEL_L",
    "QUARTER_PANEL_R",
    "REAR_FENDER_L",
    "REAR_FENDER_R",
    "SIDE_SILL_L",
    "SIDE_SILL_R",
    "FRONT_APRON_L",
    "FRONT_APRON_R",
    "REAR_STRUCTURE_PANEL",
    "WINDSHIELD",
    "REAR_GLASS"
  ],
  TWO_WHEELER: [
    "TW_FRONT_FENDER",
    "TW_REAR_FENDER",
    "TW_FUEL_TANK",
    "TW_FRONT_COWL",
    "TW_SIDE_PANEL_L",
    "TW_SIDE_PANEL_R",
    "TW_TAIL_COWL",
    "TW_GRAVEL_GUARD",
    "TW_FRAME_CRADLE",
    "TW_SWINGARM_COVER",
    "TW_HEADLAMP_BEZEL",
    "TW_HANDLEBAR_COVER",
    "TW_EXHAUST_SHIELD",
    "TW_CHAIN_COVER",
    "TW_SEAT_COWL",
    "TW_FRONT_FORK_COVER_L",
    "TW_FRONT_FORK_COVER_R",
    "TW_WHEEL_RIM"
  ]
};
function panelOwner(panel) {
  const entries = Object.entries(PANEL_GROUPS);
  for (const [owner, panels] of entries) {
    if (panels.includes(panel)) return owner;
  }
  throw new Error(`Unknown panel code: ${panel}`);
}
var PANEL_LABELS = {
  FRONT_BUMPER: "Front bumper",
  REAR_BUMPER: "Rear bumper",
  FRONT_FENDER_L: "Front fender (L)",
  FRONT_FENDER_R: "Front fender (R)",
  HOOD: "Hood/bonnet",
  BOOT_LID: "Boot lid",
  ROOF: "Roof",
  FRONT_DOOR_L: "Front door (L)",
  FRONT_DOOR_R: "Front door (R)",
  REAR_DOOR_L: "Rear door (L)",
  REAR_DOOR_R: "Rear door (R)",
  QUARTER_PANEL_L: "Quarter panel (L)",
  QUARTER_PANEL_R: "Quarter panel (R)",
  REAR_FENDER_L: "Rear fender (L)",
  REAR_FENDER_R: "Rear fender (R)",
  SIDE_SILL_L: "Side sill (L)",
  SIDE_SILL_R: "Side sill (R)",
  FRONT_APRON_L: "Front apron (L)",
  FRONT_APRON_R: "Front apron (R)",
  REAR_STRUCTURE_PANEL: "Rear structure panel",
  WINDSHIELD: "Windshield",
  REAR_GLASS: "Rear glass",
  TW_FRONT_FENDER: "Front fender",
  TW_REAR_FENDER: "Rear fender",
  TW_FUEL_TANK: "Fuel tank",
  TW_FRONT_COWL: "Front cowl",
  TW_SIDE_PANEL_L: "Side panel (L)",
  TW_SIDE_PANEL_R: "Side panel (R)",
  TW_TAIL_COWL: "Tail cowl",
  TW_GRAVEL_GUARD: "Gravel guard",
  TW_FRAME_CRADLE: "Frame cradle",
  TW_SWINGARM_COVER: "Swingarm cover",
  TW_HEADLAMP_BEZEL: "Headlamp bezel",
  TW_HANDLEBAR_COVER: "Handlebar cover",
  TW_EXHAUST_SHIELD: "Exhaust shield",
  TW_CHAIN_COVER: "Chain cover",
  TW_SEAT_COWL: "Seat cowl",
  TW_FRONT_FORK_COVER_L: "Fork cover (L)",
  TW_FRONT_FORK_COVER_R: "Fork cover (R)",
  TW_WHEEL_RIM: "Wheel rim"
};

// ../../packages/core/src/modules/valuation/domain/refurb-matrix.ts
var BASE = {
  PASSENGER: { bySeverity: { MINOR: 4e4, MODERATE: 15e4, MAJOR: 25e4 }, paint: 35e4, part: 12e4 },
  TWO_WHEELER: { bySeverity: { MINOR: 15e3, MODERATE: 6e4, MAJOR: 9e4 }, paint: 12e4, part: 45e3 }
};
var PANEL_WEIGHT = {
  FRONT_BUMPER: 1,
  REAR_BUMPER: 1,
  FRONT_FENDER_L: 0.85,
  FRONT_FENDER_R: 0.85,
  HOOD: 1.3,
  BOOT_LID: 1.2,
  ROOF: 1.5,
  FRONT_DOOR_L: 1.2,
  FRONT_DOOR_R: 1.2,
  REAR_DOOR_L: 1.1,
  REAR_DOOR_R: 1.1,
  QUARTER_PANEL_L: 1.15,
  QUARTER_PANEL_R: 1.15,
  REAR_FENDER_L: 0.9,
  REAR_FENDER_R: 0.9,
  SIDE_SILL_L: 0.9,
  SIDE_SILL_R: 0.9,
  FRONT_APRON_L: 0.8,
  FRONT_APRON_R: 0.8,
  REAR_STRUCTURE_PANEL: 1.4,
  WINDSHIELD: 1.2,
  REAR_GLASS: 1.1,
  TW_FRONT_FENDER: 0.75,
  TW_REAR_FENDER: 0.75,
  TW_FUEL_TANK: 1,
  TW_FRONT_COWL: 0.8,
  TW_SIDE_PANEL_L: 1,
  TW_SIDE_PANEL_R: 1,
  TW_TAIL_COWL: 0.8,
  TW_GRAVEL_GUARD: 0.6,
  TW_FRAME_CRADLE: 1.2,
  TW_SWINGARM_COVER: 0.6,
  TW_HEADLAMP_BEZEL: 0.5,
  TW_HANDLEBAR_COVER: 0.5,
  TW_EXHAUST_SHIELD: 0.6,
  TW_CHAIN_COVER: 0.5,
  TW_SEAT_COWL: 0.7,
  TW_FRONT_FORK_COVER_L: 0.5,
  TW_FRONT_FORK_COVER_R: 0.5,
  TW_WHEEL_RIM: 0.9
};
var TIER_MULTIPLIER = {
  BUDGET: 1,
  PREMIUM: 1.8,
  LUXURY: 3.2
};
function refurbLabourMinor(owner, panel, severity2, tier) {
  const labour = BASE[owner].bySeverity[severity2] * PANEL_WEIGHT[panel];
  return Math.round(labour * TIER_MULTIPLIER[tier]);
}
function refurbPaintMinor(owner, panel, severity2, tier) {
  const paint = severity2 === "MAJOR" || severity2 === "MODERATE" ? BASE[owner].paint : 0;
  return Math.round(paint * TIER_MULTIPLIER[tier]);
}
function refurbPartFallbackMinor(owner, panel, tier) {
  const base = BASE[owner].part * PANEL_WEIGHT[panel];
  return Math.round(base * TIER_MULTIPLIER[tier]);
}

// ../../packages/core/src/modules/valuation/domain/refurbishment.ts
var REFURBISHMENT_MODEL_VERSION = "refurb-dev-0";
function computeRefurbishmentLine(input, partsCatalog) {
  const owner = panelOwner(input.panel);
  const labourMinor = refurbLabourMinor(owner, input.panel, input.severity, input.tier);
  const paintMinor = refurbPaintMinor(owner, input.panel, input.severity, input.tier);
  let partMinor = 0;
  let partSource = "NONE";
  let fallback = false;
  if (input.severity === "MAJOR") {
    const known = partsCatalog.partPriceMinor(input.model, input.panel);
    if (known != null) {
      partMinor = known;
      partSource = "PARTS_MASTER";
    } else {
      partMinor = refurbPartFallbackMinor(owner, input.panel, input.tier);
      partSource = "MATRIX_FALLBACK";
      fallback = true;
    }
  }
  return {
    panel: input.panel,
    severity: input.severity,
    totalMinor: partMinor + labourMinor + paintMinor,
    partMinor,
    labourMinor,
    paintMinor,
    partSource,
    fallback,
    modelVersion: REFURBISHMENT_MODEL_VERSION
  };
}

// ../../packages/core/src/modules/valuation/domain/parts-master.ts
var SEED = {
  "Tata Nano": { FRONT_BUMPER: 45e4, REAR_BUMPER: 38e4, FRONT_FENDER_L: 32e4, FRONT_FENDER_R: 32e4, HOOD: 95e4, FRONT_DOOR_L: 8e5, FRONT_DOOR_R: 8e5, WINDSHIELD: 11e5 },
  "Mercedes-Benz C-Class": { FRONT_BUMPER: 145e5, REAR_BUMPER: 13e6, FRONT_FENDER_L: 98e5, FRONT_FENDER_R: 98e5, HOOD: 18e6, FRONT_DOOR_L: 15e6, FRONT_DOOR_R: 15e6, WINDSHIELD: 95e5 }
};
var ProvisionalPartsPriceCatalog = class {
  constructor() {
    __publicField(this, "rows", SEED);
  }
  partPriceMinor(model, panel) {
    const byModel = this.rows[model];
    if (!byModel) return null;
    const price = byModel[panel];
    return price == null ? null : price;
  }
};

// ../../packages/core/src/modules/valuation/domain/estimate.ts
var defaultPartsCatalog = new ProvisionalPartsPriceCatalog();
function computeValuation(input, partsCatalog = defaultPartsCatalog) {
  const curve = CATEGORY_CURVES[input.category];
  const ageYears = Math.max(0, input.asOfYear - input.mfgYear);
  const base = baseResidualMinor(input.baseExShowroomMinor, curve, ageYears);
  const adjustments = [];
  let central = base;
  if (input.stage === "DECLARED") {
    if (input.odometerKm != null) {
      const a = odometerAdjustment(input.odometerKm, expectedKm(curve.avgAnnualKm, ageYears));
      if (a) adjustments.push(a);
    }
    if (input.ownerCount != null) {
      const a = ownerAdjustment(input.ownerCount);
      if (a) adjustments.push(a);
    }
    if (input.declaredCondition != null) {
      adjustments.push(conditionAdjustment(input.declaredCondition));
    }
    central = Math.round(adjustments.reduce((acc, a) => acc * (1 + a.impactPct / 100), base));
  }
  const refurbishments = input.stage === "DECLARED" ? computeDamageRefurbishments(input, partsCatalog) : [];
  const refurbTotalMinor = refurbishments.reduce((acc, r) => acc + r.totalMinor, 0);
  if (refurbTotalMinor > 0) {
    adjustments.push({
      factor: "repair deductions",
      impactPct: -Number((refurbTotalMinor / central * 100).toFixed(1)),
      detail: `${refurbishments.length} damage item(s): ${refurbishments.map((r) => r.panel).join(", ")}`
    });
    central = Math.max(0, central - refurbTotalMinor);
  }
  const bounded = applyPriceSafetyBounds(central, input.baseExShowroomMinor);
  central = bounded.boundedMinor;
  const explanation = buildValuationExplanation(base, central, adjustments);
  const odometerAnomaly = input.odometerKm != null ? detectOdometerAnomaly(input.odometerKm, ageYears, input.category) : void 0;
  const confidence = CONFIDENCE_BY_STAGE[input.stage];
  return {
    stage: input.stage,
    centralMinor: central,
    baseExShowroomMinor: input.baseExShowroomMinor,
    bands: computeBands(central, STAGE_HALF_WIDTH[input.stage]),
    headline: { valueMinor: headlineMinor(central), band: "TRADE_IN" },
    confidence: {
      level: confidence.level,
      score: confidence.score,
      basis: `Rules model ${VALUATION_MODEL_VERSION}; no comparables; 0 inspections`
    },
    adjustments,
    explanation,
    odometerAnomaly,
    refurbishments,
    refurbTotalMinor,
    modelVersion: VALUATION_MODEL_VERSION
  };
}
function computeDamageRefurbishments(input, partsCatalog) {
  var _a, _b, _c;
  const items = (_a = input.damageItems) != null ? _a : [];
  const tier = (_b = input.segmentTier) != null ? _b : "BUDGET";
  const model = (_c = input.model) != null ? _c : "";
  return items.map(
    (d) => computeRefurbishmentLine({ model, panel: d.panel, severity: d.severity, tier }, partsCatalog)
  );
}

// ../../packages/core/src/modules/valuation/domain/comparable-scoring.ts
var DEFAULT_SIMILARITY_THRESHOLD = 50;
function eq(a, b) {
  return a != null && b != null && a.trim().toUpperCase() === b.trim().toUpperCase();
}
function saleAgeDays(saleDate, asOfYear) {
  const t = Date.parse(saleDate);
  if (!Number.isFinite(t)) return null;
  const ref = new Date(asOfYear, 11, 31).getTime();
  const days = Math.round((ref - t) / 864e5);
  return days < 0 ? 0 : days;
}
function scoreComparable(target, sale, ctx) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const reasons = [];
  if (target.make.trim().toUpperCase() !== sale.make.trim().toUpperCase() || target.model.trim().toUpperCase() !== sale.model.trim().toUpperCase()) {
    return { sale, score: 0, reasons: ["different make/model"] };
  }
  let score = 10;
  reasons.push("same make+model");
  const yearDelta = Math.abs(sale.mfgYear - target.mfgYear);
  if (yearDelta > 3) {
    return { sale, score: 0, reasons: [...reasons, "year too distant \u2014 ineligible"] };
  }
  if (((_a = target.variant) == null ? void 0 : _a.trim()) && ((_b = sale.variant) == null ? void 0 : _b.trim())) {
    if (eq(target.variant, sale.variant)) {
      score += 15;
      reasons.push("same variant");
    } else {
      reasons.push("different variant");
    }
  } else {
    score += 7;
    reasons.push("variant uncompared");
  }
  if (yearDelta <= 1) {
    score += 20;
    reasons.push("year \xB11");
  } else if (yearDelta === 2) {
    score += 12;
    reasons.push("year \xB12");
  } else if (yearDelta === 3) {
    score += 5;
    reasons.push("year \xB13");
  } else {
    reasons.push("year distant");
  }
  if (target.odometerKm != null && sale.odometerKm > 0) {
    const ratio = Math.abs(sale.odometerKm - target.odometerKm) / Math.max(1, target.odometerKm);
    if (ratio <= 0.2) {
      score += 15;
      reasons.push("odometer close");
    } else if (ratio <= 0.5) {
      score += 8;
      reasons.push("odometer near");
    } else {
      score += 2;
      reasons.push("odometer distant");
    }
  } else {
    score += 5;
    reasons.push("odometer uncompared");
  }
  if (((_c = target.fuel) == null ? void 0 : _c.trim()) && ((_d = sale.fuel) == null ? void 0 : _d.trim())) {
    if (eq(target.fuel, sale.fuel)) {
      score += 10;
      reasons.push("same fuel");
    } else {
      reasons.push("different fuel");
    }
  } else {
    score += 5;
    reasons.push("fuel uncompared");
  }
  if (((_e = target.transmission) == null ? void 0 : _e.trim()) && ((_f = sale.transmission) == null ? void 0 : _f.trim())) {
    if (eq(target.transmission, sale.transmission)) {
      score += 5;
      reasons.push("same transmission");
    } else {
      reasons.push("different transmission");
    }
  } else {
    score += 2;
    reasons.push("transmission uncompared");
  }
  const refCity = ((_h = (_g = ctx.saleCity) != null ? _g : ctx.inspectionCity) != null ? _h : "").trim().toUpperCase();
  if (refCity && sale.saleCity.trim().toUpperCase() === refCity) {
    score += 10;
    reasons.push("same city");
  } else {
    reasons.push("city uncompared");
  }
  const age = saleAgeDays(sale.saleDate, ctx.asOfYear);
  if (age != null && age <= 180) {
    score += 15;
    reasons.push("recent sale");
  } else if (age != null && age <= 365) {
    score += 7;
    reasons.push("sale within a year");
  } else {
    reasons.push("stale/missing sale date");
  }
  return { sale, score, reasons };
}
function rankComparables(target, sales, ctx) {
  return sales.filter((s) => s.soldPriceMinor > 0).map((sale) => scoreComparable(target, sale, ctx)).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const bd = Date.parse(b.sale.saleDate);
    const ad = Date.parse(a.sale.saleDate);
    const bSafe = Number.isFinite(bd) ? bd : -1;
    const aSafe = Number.isFinite(ad) ? ad : -1;
    if (bSafe !== aSafe) return bSafe - aSafe;
    if (a.sale.soldPriceMinor !== b.sale.soldPriceMinor)
      return a.sale.soldPriceMinor - b.sale.soldPriceMinor;
    return a.sale.saleCity.localeCompare(b.sale.saleCity);
  });
}

// ../../packages/core/src/modules/valuation/domain/tradein-pricing.ts
var TRADEIN_PRICING_MODEL_VERSION = "tradein-rules-0";
var EmptyComparableSales = class {
  findComparables(_vehicle) {
    return [];
  }
};
var DEFAULT_MARKET_FACTORS = {
  // Neutral until market research approves per-city values (provisional).
  cityMultipliers: {},
  comparableWeight: 0.3,
  minComparables: 3,
  demandMaxPct: 5,
  repaintAllowanceMinor: 15e4
};
function roundTo100Rupees2(minor) {
  return Math.round(minor / 1e4) * 1e4;
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
var RulesPricingEngine = class {
  constructor(comparables = new EmptyComparableSales(), market = DEFAULT_MARKET_FACTORS, partsCatalog) {
    __publicField(this, "comparables", comparables);
    __publicField(this, "market", market);
    __publicField(this, "partsCatalog", partsCatalog);
  }
  estimate(features, asOfYear) {
    var _a, _b, _c, _d, _e;
    const v = features.vehicle;
    const warnings = [];
    if (!v.make.trim() || !v.model.trim() || !Number.isFinite(v.mfgYear) || v.baseExShowroomMinor <= 0) {
      return {
        status: "NEEDS_MANUAL_REVIEW",
        estimatedPriceMinor: null,
        lowerPriceMinor: null,
        upperPriceMinor: null,
        confidence: null,
        confidenceBreakdown: [],
        factors: [],
        warnings: ["Vehicle identity is incomplete \u2014 resolve Make/Model/Year before pricing."],
        modelVersion: TRADEIN_PRICING_MODEL_VERSION
      };
    }
    const damageItems = features.panels.filter((p) => p.severity !== "NONE").map((p) => ({
      panel: p.panel,
      severity: p.severity === "CRITICAL" ? "MAJOR" : p.severity
    }));
    const criticalPanels = features.panels.filter((p) => p.severity === "CRITICAL");
    if (criticalPanels.length > 0) {
      warnings.push(
        `Structural-grade damage on ${criticalPanels.map((p) => p.panel).join(", ")} \u2014 costed as major repair; expert review advised.`
      );
    }
    const computation = computeValuation(
      {
        category: v.category,
        baseExShowroomMinor: v.baseExShowroomMinor,
        mfgYear: v.mfgYear,
        asOfYear,
        stage: "DECLARED",
        ...v.odometerKm != null ? { odometerKm: v.odometerKm } : {},
        ...v.previousOwners != null ? { ownerCount: v.previousOwners } : {},
        ...features.declaredCondition != null ? { declaredCondition: features.declaredCondition } : {},
        model: v.modelKey,
        segmentTier: v.segmentTier,
        damageItems
      },
      this.partsCatalog
    );
    const factors = [...computation.adjustments];
    let central = computation.centralMinor;
    const repaintCount = features.panels.filter((p) => p.repaint && !p.manualReview).length;
    const uncertainRepaint = features.panels.filter((p) => p.repaint && p.manualReview).length;
    if (repaintCount > 0 && this.market.repaintAllowanceMinor > 0) {
      const total = repaintCount * this.market.repaintAllowanceMinor;
      factors.push({
        factor: "repaint allowance",
        impactPct: -Number((total / central * 100).toFixed(1)),
        detail: `${repaintCount} confirmed repainted panel(s)`
      });
      central = Math.max(0, central - total);
    }
    if (uncertainRepaint > 0) {
      warnings.push(
        `${uncertainRepaint} panel(s) show uncertain repaint signals \u2014 flagged for review, no price deduction.`
      );
    }
    const manualPanels = features.panels.filter((p) => p.manualReview).length;
    if (manualPanels > 0) {
      warnings.push(`${manualPanels} panel finding(s) need manual review.`);
    }
    const threshold = (_a = this.market.similarityThreshold) != null ? _a : DEFAULT_SIMILARITY_THRESHOLD;
    const candidateRows = features.comparables.length > 0 ? features.comparables : this.comparables.findComparables(v);
    const ranked = rankComparables(
      {
        make: v.make,
        model: v.model,
        variant: v.variant,
        mfgYear: v.mfgYear,
        odometerKm: v.odometerKm,
        fuel: v.fuel,
        transmission: (_b = v.transmission) != null ? _b : null
      },
      candidateRows,
      { saleCity: features.saleCity, inspectionCity: features.inspectionCity, asOfYear }
    );
    const qualifying = ranked.filter((r) => r.score >= threshold);
    const soldQualifying = qualifying.filter((r) => {
      var _a2;
      return ((_a2 = r.sale.priceType) != null ? _a2 : "SOLD") !== "ASKING";
    });
    const askingQualifying = qualifying.filter((r) => r.sale.priceType === "ASKING");
    const anchorSet = soldQualifying.length >= this.market.minComparables ? soldQualifying : askingQualifying;
    const anchored = anchorSet.length >= this.market.minComparables;
    const anchoredOnAsking = anchored && soldQualifying.length < this.market.minComparables;
    if (anchored) {
      const anchor = median(anchorSet.map((r) => r.sale.soldPriceMinor));
      const avgSimilarity = Math.round(
        anchorSet.reduce((n, r) => n + r.score, 0) / anchorSet.length
      );
      const soldCount = anchorSet.filter((r) => {
        var _a2;
        return ((_a2 = r.sale.priceType) != null ? _a2 : "SOLD") !== "ASKING";
      }).length;
      const askingCount = anchorSet.length - soldCount;
      const blended = Math.round(central + (anchor - central) * this.market.comparableWeight);
      const impactPct = Number(((blended - central) / central * 100).toFixed(1));
      if (impactPct !== 0) {
        factors.push({
          factor: "comparable sales anchor",
          impactPct,
          detail: `median of ${anchorSet.length} comparable sale(s) (${soldCount} sold, ${askingCount} asking), avg similarity ${avgSimilarity}`
        });
        central = Math.max(0, blended);
      }
      if (anchoredOnAsking) {
        warnings.push(
          "Market anchor is based on asking/listing prices, not confirmed sold prices."
        );
      }
    } else {
      warnings.push(
        candidateRows.length === 0 ? "No historical comparable sales yet \u2014 rules estimate only." : qualifying.length === 0 ? `${candidateRows.length} historical sale(s) found but none similar enough (threshold ${threshold}) \u2014 no anchor.` : `Only ${qualifying.length} similar comparable sale(s) \u2014 below the ${this.market.minComparables} needed to anchor.`
      );
    }
    const cityKey = ((_d = (_c = features.saleCity) != null ? _c : features.inspectionCity) != null ? _d : "").trim().toUpperCase();
    const multiplier = cityKey ? (_e = this.market.cityMultipliers[cityKey]) != null ? _e : 1 : 1;
    if (multiplier !== 1) {
      const impactPct = Number(((multiplier - 1) * 100).toFixed(1));
      factors.push({ factor: "city adjustment", impactPct, detail: cityKey });
      central = Math.max(0, Math.round(central * multiplier));
    }
    if (features.demandScore != null && Number.isFinite(features.demandScore)) {
      const clamped = Math.min(100, Math.max(0, features.demandScore));
      const impactPct = Number(((clamped - 50) / 50 * this.market.demandMaxPct).toFixed(1));
      if (impactPct !== 0) {
        factors.push({ factor: "demand adjustment", impactPct, detail: `demand score ${clamped}` });
        central = Math.max(0, Math.round(central * (1 + impactPct / 100)));
      }
    }
    central = applyPriceSafetyBounds(central, v.baseExShowroomMinor).boundedMinor;
    const bands = computeBands(central, STAGE_HALF_WIDTH["DECLARED"]);
    const estimated = headlineMinor(central);
    const breakdown = [
      { component: "rules methodology", earned: 40, max: 40, note: "deterministic core" }
    ];
    if (v.odometerKm != null) {
      breakdown.push({ component: "odometer", earned: 10, max: 10, note: "confirmed O1" });
    } else {
      breakdown.push({ component: "odometer", earned: 0, max: 10, note: "unconfirmed" });
      warnings.push("Odometer input is unconfirmed \u2014 confirm O1 for a firmer price.");
    }
    if (v.previousOwners != null) {
      breakdown.push({ component: "owners", earned: 10, max: 10, note: "confirmed O2" });
    } else {
      breakdown.push({ component: "owners", earned: 0, max: 10, note: "unconfirmed" });
      warnings.push("Owner count is unconfirmed \u2014 confirm O2 for a firmer price.");
    }
    if (!features.conditionIncomplete && manualPanels === 0) {
      breakdown.push({ component: "condition", earned: 15, max: 15, note: "8/8 angles, no review flags" });
    } else if (!features.conditionIncomplete) {
      breakdown.push({ component: "condition", earned: 8, max: 15, note: "full coverage with review flags" });
    } else {
      breakdown.push({ component: "condition", earned: 0, max: 15, note: "incomplete coverage" });
    }
    if (anchored) {
      breakdown.push({
        component: "comparables",
        earned: anchoredOnAsking ? 8 : 15,
        max: 15,
        note: `${anchorSet.length} similar sale(s)` + (anchoredOnAsking ? " (asking-based anchor)" : "")
      });
    } else if (candidateRows.length > 0) {
      breakdown.push({
        component: "comparables",
        earned: 5,
        max: 15,
        note: "sales exist but too few similar"
      });
    } else {
      breakdown.push({ component: "comparables", earned: 0, max: 15, note: "no sales data" });
    }
    const freshAges = anchorSet.map((r) => saleAgeDays(r.sale.saleDate, asOfYear)).filter((d) => d != null);
    const avgAge = freshAges.length > 0 ? freshAges.reduce((n, d) => n + d, 0) / freshAges.length : null;
    if (avgAge != null && avgAge <= 180) {
      breakdown.push({ component: "freshness", earned: 10, max: 10, note: `avg sale age ${Math.round(avgAge)}d` });
    } else if (avgAge != null && avgAge <= 365) {
      breakdown.push({ component: "freshness", earned: 5, max: 10, note: `avg sale age ${Math.round(avgAge)}d` });
      warnings.push("Comparable sales are ageing (avg over 6 months) \u2014 treat the anchor cautiously.");
    } else {
      breakdown.push({ component: "freshness", earned: 0, max: 10, note: avgAge == null ? "no dated sales" : "stale market" });
      if (anchored) warnings.push("Comparable sales are stale (avg over a year old) \u2014 treat the anchor cautiously.");
    }
    const raw = breakdown.reduce((n, c) => n + c.earned, 0);
    const fullEvidence = anchored && !features.conditionIncomplete && manualPanels === 0;
    const cap = fullEvidence ? 89 : 69;
    const score = Math.min(raw, cap);
    const level = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
    return {
      status: "READY",
      estimatedPriceMinor: roundTo100Rupees2(estimated),
      lowerPriceMinor: bands.tradeIn.low,
      upperPriceMinor: bands.tradeIn.high,
      confidence: {
        level,
        score,
        basis: `Rules model ${TRADEIN_PRICING_MODEL_VERSION} (cap ${cap}); ${breakdown.map((c) => `${c.component} ${c.earned}/${c.max}`).join("; ")}`
      },
      confidenceBreakdown: breakdown,
      factors,
      warnings,
      modelVersion: TRADEIN_PRICING_MODEL_VERSION
    };
  }
};

// ../../packages/core/src/modules/valuation/domain/repair-reference.ts
function referencePartsMidpointMinor(ref) {
  if (ref.evidence !== "sufficient") return null;
  const { partsCostMin: min, partsCostMax: max } = ref;
  if (min == null || max == null || !Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min < 0 || max < 0 || min > max) return null;
  return Math.round((min + max) / 2 * 100);
}
function selectPricedParts(refs, isKnownPanel) {
  const prices = {};
  const skipped = [];
  for (const ref of refs) {
    if (ref.severity === "NONE" || ref.damageType === "NONE") {
      skipped.push(`${ref.part}: no damage \u2014 no cost researched`);
      continue;
    }
    if (!isKnownPanel(ref.part)) {
      skipped.push(`${ref.part}: outside priced taxonomy`);
      continue;
    }
    const midpoint = referencePartsMidpointMinor(ref);
    if (midpoint == null) {
      skipped.push(`${ref.part}: insufficient evidence \u2014 manual review`);
      continue;
    }
    if (prices[ref.part] == null) prices[ref.part] = midpoint;
  }
  return { prices, skipped };
}

// ../../packages/core/src/modules/valuation/domain/market-parts-catalog.ts
var MarketAwarePartsCatalog = class {
  constructor(base, referencePricesMinor) {
    __publicField(this, "base", base);
    __publicField(this, "referencePricesMinor", referencePricesMinor);
  }
  partPriceMinor(model, panel) {
    const approved = this.base.partPriceMinor(model, panel);
    if (approved != null) return approved;
    const ref = this.referencePricesMinor[panel];
    if (ref == null || !Number.isFinite(ref) || ref <= 0) return null;
    return Math.floor(ref);
  }
};

// src/app/inspect/[id]/pricing-summary.ts
function toRupees(minor) {
  const sign = minor < 0 ? "\u2212" : "";
  return `${sign}\u20B9${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(minor) / 100))}`;
}
function findingsToPanelConditions(angles, modelKey, tier, partsCatalog = new ProvisionalPartsPriceCatalog()) {
  const known = /* @__PURE__ */ new Set([...PANEL_GROUPS.PASSENGER, ...PANEL_GROUPS.TWO_WHEELER]);
  const catalog = partsCatalog;
  const conditions = [];
  const warnings = [...angles.warnings];
  for (const f of angles.findings) {
    if (f.severity === "NONE" && !f.repaint) continue;
    if (!known.has(f.panel)) {
      warnings.push(
        `Panel ${f.panel} is outside the priced taxonomy \u2014 excluded from repair costing.`
      );
      continue;
    }
    const panel = f.panel;
    const repairCostMinor = f.severity === "NONE" ? 0 : computeRefurbishmentLine(
      {
        model: modelKey,
        panel,
        severity: f.severity === "MAJOR" || f.severity === "CRITICAL" ? "MAJOR" : f.severity === "MODERATE" ? "MODERATE" : "MINOR",
        tier
      },
      catalog
    ).totalMinor;
    conditions.push({
      panel,
      damageType: f.damageType,
      severity: f.severity,
      action: f.repairOrReplace,
      repairCostMinor,
      repaint: f.repaint,
      confidence: f.confidence,
      manualReview: f.manualReview
    });
  }
  return { conditions, warnings };
}
function buildPricingSummary(input) {
  var _a, _b, _c, _d, _e;
  const { canonical, angles } = input;
  const knownPanels = /* @__PURE__ */ new Set([...PANEL_GROUPS.PASSENGER, ...PANEL_GROUPS.TWO_WHEELER]);
  const isKnown = (p) => knownPanels.has(p);
  const { prices: referencePrices, skipped: referenceSkipped } = selectPricedParts(
    (_a = input.repairReferences) != null ? _a : [],
    isKnown
  );
  const partsCatalog = new MarketAwarePartsCatalog(new ProvisionalPartsPriceCatalog(), referencePrices);
  const engine = new RulesPricingEngine(void 0, void 0, partsCatalog);
  if (canonical.status !== "READY" || !canonical.profile) {
    const result2 = {
      status: "NEEDS_MANUAL_REVIEW",
      estimatedPriceMinor: null,
      lowerPriceMinor: null,
      upperPriceMinor: null,
      confidence: null,
      confidenceBreakdown: [],
      factors: [],
      warnings: canonical.warnings,
      modelVersion: "tradein-rules-0"
    };
    return {
      result: result2,
      rows: [{ label: "Status", value: "Needs manual review \u2014 identity unresolved" }],
      market: { qualifying: 0, sold: 0, asking: 0, anchorMinor: null, avgSimilarity: null, freshnessDays: null }
    };
  }
  const { conditions, warnings } = findingsToPanelConditions(
    angles,
    canonical.profile.modelKey,
    canonical.profile.segmentTier,
    partsCatalog
  );
  const features = {
    vehicle: canonical.profile,
    panels: conditions,
    declaredCondition: (_b = input.declaredCondition) != null ? _b : null,
    repaintPanels: conditions.filter((c) => c.repaint && !c.manualReview).length,
    inspectionScore: null,
    conditionIncomplete: angles.findings.length < 8,
    saleCity: canonical.saleCity,
    inspectionCity: canonical.inspectionCity,
    demandScore: (_c = input.demandScore) != null ? _c : null,
    comparables: (_d = input.comparables) != null ? _d : []
  };
  const result = engine.estimate(features, input.asOfYear);
  const allWarnings = [...canonical.warnings, ...warnings, ...referenceSkipped, ...result.warnings];
  const market = buildMarketStats(
    canonical,
    (_e = input.comparables) != null ? _e : [],
    input.asOfYear,
    result
  );
  const rows = [
    { label: "Ex-showroom reference", value: toRupees(canonical.profile.baseExShowroomMinor) },
    ...result.factors.map((f) => ({
      label: f.detail ? `${f.factor} (${f.detail})` : f.factor,
      value: `${f.impactPct > 0 ? "+" : ""}${f.impactPct}%`
    })),
    {
      label: "Estimated Trade-in Price",
      value: result.estimatedPriceMinor != null ? toRupees(result.estimatedPriceMinor) : "\u2014"
    },
    {
      label: "Price range",
      value: result.lowerPriceMinor != null && result.upperPriceMinor != null ? `${toRupees(result.lowerPriceMinor)} \u2013 ${toRupees(result.upperPriceMinor)}` : "\u2014"
    },
    {
      label: "Confidence",
      value: result.confidence ? `${result.confidence.level} (${result.confidence.score}%) \u2014 ${result.confidence.basis}` : "\u2014"
    }
  ];
  return { result: { ...result, warnings: allWarnings }, rows, market };
}
function buildMarketStats(canonical, comparables, asOfYear, result) {
  var _a;
  if (!canonical.profile || comparables.length === 0) {
    return { qualifying: 0, sold: 0, asking: 0, anchorMinor: null, avgSimilarity: null, freshnessDays: null };
  }
  const v = canonical.profile;
  const ranked = rankComparables(
    {
      make: v.make,
      model: v.model,
      variant: v.variant,
      mfgYear: v.mfgYear,
      odometerKm: v.odometerKm,
      fuel: v.fuel,
      transmission: (_a = v.transmission) != null ? _a : null
    },
    comparables,
    { saleCity: canonical.saleCity, inspectionCity: canonical.inspectionCity, asOfYear }
  ).filter((r) => r.score >= DEFAULT_SIMILARITY_THRESHOLD);
  if (ranked.length === 0) {
    return { qualifying: 0, sold: 0, asking: 0, anchorMinor: null, avgSimilarity: null, freshnessDays: null };
  }
  const sold = ranked.filter((r) => {
    var _a2;
    return ((_a2 = r.sale.priceType) != null ? _a2 : "SOLD") !== "ASKING";
  });
  const asking = ranked.filter((r) => r.sale.priceType === "ASKING");
  const set = sold.length >= DEFAULT_MARKET_FACTORS.minComparables ? sold : asking;
  const anchorFactor = result.factors.find((f) => f.factor === "comparable sales anchor");
  const ages = set.map((r) => saleAgeDays(r.sale.saleDate, asOfYear)).filter((d) => d != null);
  return {
    qualifying: ranked.length,
    sold: sold.length,
    asking: asking.length,
    anchorMinor: anchorFactor ? medianOf(set.map((r) => r.sale.soldPriceMinor)) : null,
    avgSimilarity: Math.round(set.reduce((n, r) => n + r.score, 0) / set.length),
    freshnessDays: ages.length > 0 ? Math.round(ages.reduce((n, d) => n + d, 0) / ages.length) : null
  };
}
function medianOf(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// src/app/inspect/[id]/vehicle-context.ts
function toDamageVehicleContext(vehicle) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y;
  if (!vehicle) return null;
  const hasRegistry = vehicle.registry_engine_cc != null || vehicle.registry_seat_capacity != null || vehicle.registry_body_type != null || vehicle.registry_color != null || vehicle.registry_rc_city != null || vehicle.registry_rc_status != null || vehicle.registry_insurance_company != null || vehicle.registry_insurance_upto != null || vehicle.registry_fit_upto != null || vehicle.registry_tax_upto != null || vehicle.registry_pucc_upto != null || vehicle.registry_financed != null || vehicle.registry_owner_count != null || vehicle.registry_mfg_month != null || vehicle.registry_registration_date != null || vehicle.registry_norms_type != null || vehicle.registry_vehicle_category_description != null || vehicle.registry_vehicle_gross_weight != null || vehicle.registry_no_cylinders != null || vehicle.registry_unladen_weight != null || vehicle.registry_permit_number != null || vehicle.registry_national_permit_number != null || vehicle.registry_blacklist_status != null || vehicle.registry_noc_details != null || vehicle.registry_rto_code != null;
  return {
    make: (_a = vehicle.make) != null ? _a : null,
    model: (_b = vehicle.model) != null ? _b : null,
    variant: (_c = vehicle.variant) != null ? _c : null,
    category: (_d = vehicle.category) != null ? _d : null,
    fuel: (_e = vehicle.fuel) != null ? _e : null,
    bodyType: (_f = vehicle.body_type) != null ? _f : null,
    segment: (_g = vehicle.segment) != null ? _g : null,
    segmentTier: (_h = vehicle.segment_tier) != null ? _h : null,
    baseExShowroomMinor: (_i = vehicle.base_ex_showroom_minor) != null ? _i : null,
    referenceYear: (_j = vehicle.reference_year) != null ? _j : null,
    mfgYear: (_k = vehicle.mfg_year) != null ? _k : null,
    ageYears: (_l = vehicle.age_years) != null ? _l : null,
    odometerKm: null,
    ownerCount: null,
    registry: hasRegistry ? {
      engineCc: (_m = vehicle.registry_engine_cc) != null ? _m : null,
      seatCapacity: (_n = vehicle.registry_seat_capacity) != null ? _n : null,
      bodyType: (_o = vehicle.registry_body_type) != null ? _o : null,
      color: (_p = vehicle.registry_color) != null ? _p : null,
      rcCity: (_q = vehicle.registry_rc_city) != null ? _q : null,
      rcState: (_r = vehicle.registry_rc_state) != null ? _r : null,
      rcStatus: (_s = vehicle.registry_rc_status) != null ? _s : null,
      insuranceCompany: (_t = vehicle.registry_insurance_company) != null ? _t : null,
      insuranceUpto: (_u = vehicle.registry_insurance_upto) != null ? _u : null,
      fitUpto: (_v = vehicle.registry_fit_upto) != null ? _v : null,
      taxUpto: (_w = vehicle.registry_tax_upto) != null ? _w : null,
      puccUpto: (_x = vehicle.registry_pucc_upto) != null ? _x : null,
      financed: (_y = vehicle.registry_financed) != null ? _y : null,
      ownerCount: (_z = vehicle.registry_owner_count) != null ? _z : null,
      mfgMonth: (_A = vehicle.registry_mfg_month) != null ? _A : null,
      registrationDate: (_B = vehicle.registry_registration_date) != null ? _B : null,
      normsType: (_C = vehicle.registry_norms_type) != null ? _C : null,
      vehicleCategoryDescription: (_D = vehicle.registry_vehicle_category_description) != null ? _D : null,
      vehicleGrossWeight: (_E = vehicle.registry_vehicle_gross_weight) != null ? _E : null,
      noCylinders: (_F = vehicle.registry_no_cylinders) != null ? _F : null,
      unladenWeight: (_G = vehicle.registry_unladen_weight) != null ? _G : null,
      sleeperCapacity: (_H = vehicle.registry_sleeper_capacity) != null ? _H : null,
      standingCapacity: (_I = vehicle.registry_standing_capacity) != null ? _I : null,
      wheelbase: (_J = vehicle.registry_wheelbase) != null ? _J : null,
      puccNumber: (_K = vehicle.registry_pucc_number) != null ? _K : null,
      permitNumber: (_L = vehicle.registry_permit_number) != null ? _L : null,
      permitIssueDate: (_M = vehicle.registry_permit_issue_date) != null ? _M : null,
      permitValidFrom: (_N = vehicle.registry_permit_valid_from) != null ? _N : null,
      permitValidUpto: (_O = vehicle.registry_permit_valid_upto) != null ? _O : null,
      permitType: (_P = vehicle.registry_permit_type) != null ? _P : null,
      nationalPermitNumber: (_Q = vehicle.registry_national_permit_number) != null ? _Q : null,
      nationalPermitUpto: (_R = vehicle.registry_national_permit_upto) != null ? _R : null,
      nationalPermitIssuedBy: (_S = vehicle.registry_national_permit_issued_by) != null ? _S : null,
      nonUseStatus: (_T = vehicle.registry_non_use_status) != null ? _T : null,
      nonUseFrom: (_U = vehicle.registry_non_use_from) != null ? _U : null,
      nonUseTo: (_V = vehicle.registry_non_use_to) != null ? _V : null,
      blacklistStatus: (_W = vehicle.registry_blacklist_status) != null ? _W : null,
      nocDetails: (_X = vehicle.registry_noc_details) != null ? _X : null,
      rtoCode: (_Y = vehicle.registry_rto_code) != null ? _Y : null
    } : null
  };
}

// src/lib/photo-quality.ts
var TINY_PHOTO_BYTES = 20 * 1024;
var TINY_PHOTO_PIXELS = 320 * 240;
var PHOTO_CAPTURE_GUIDANCE = [
  "Stand at a standard distance so the full vehicle is visible.",
  "Keep the vehicle centered with no major side cut off.",
  "Capture in sufficient lighting; at night move to better light if possible.",
  "Hold steady and keep the image sharp."
];
var POOR_LIGHTING_GUIDANCE = "Please capture the vehicle in better lighting.";

// src/lib/integrity-reasons.ts
function signalPredicate(key, kind) {
  const noun = evidenceNoun(kind);
  switch (key) {
    case "exact_duplicate":
      return noun === "photo" ? "is an exact copy of another photo \u2014 please take a fresh photo" : noun === "document" ? "is an exact copy of another document \u2014 please upload a fresh document" : "is an exact copy of another file \u2014 please upload a fresh file";
    case "perceptual_hash_near_duplicate":
      return "matches a photo already used in another inspection \u2014 please retake it at the vehicle";
    case "screenshot_detection":
      return "looks like a screenshot rather than a live camera photo \u2014 please capture it with the camera";
    default:
      return null;
  }
}
function explainIntegrityFailure(media, labels) {
  var _a, _b, _c, _d;
  const reasons = [];
  for (const m of media) {
    if (((_b = (_a = m.integrity) == null ? void 0 : _a.risk_score) != null ? _b : 0) <= 70) continue;
    const failed = ((_d = (_c = m.integrity) == null ? void 0 : _c.signals) != null ? _d : []).filter((s) => s.status === "FAIL");
    const known = failed.find((s) => signalPredicate(s.key, m.kind) !== null);
    const predicate = known ? signalPredicate(known.key, m.kind) : "couldn't be verified \u2014 please retake it";
    const name2 = resolveItemDisplayName(m.item_code, labels);
    const subject = name2 ? `The ${name2}` : `This ${evidenceNoun(m.kind)}`;
    reasons.push({ item: m.item_code, message: `${subject} ${predicate}.` });
  }
  return reasons;
}

// src/lib/final-valuation-card.ts
function buildFinalValuationRequest(inputs) {
  return {
    vehicle_id: inputs.vehicleId,
    stage: "DECLARED",
    inspection_id: inputs.inspectionId,
    ...inputs.odometerKm != null ? { odometer_km: inputs.odometerKm } : {},
    ...inputs.ownerCount != null ? { owner_count: inputs.ownerCount } : {},
    ...inputs.declaredCondition != null ? { declared_condition: inputs.declaredCondition } : {}
  };
}
function selectFinalValuationCard(res) {
  if (res.status !== "READY") return null;
  const final = res.valuation.final_estimated_value;
  if (!final) return null;
  return {
    valueMinor: final.value_minor,
    confidenceLevel: res.valuation.confidence.level,
    confidenceScore: res.valuation.confidence.score
  };
}

// src/lib/condition.ts
var COSMETIC_AREAS2 = [
  "PAINT",
  "LAMPS",
  "GLASS",
  "TYRES_WHEELS",
  "PANELS",
  "INTERIOR",
  "OTHER"
];
var COSMETIC_SEVERITIES2 = ["MINOR", "MODERATE", "MAJOR"];

// src/lib/photo-dhash.ts
var NEAR_DUPLICATE_DISTANCE = 5;
function hammingDistanceHex(a, b) {
  var _a, _b;
  const shorter = Math.min(a.length, b.length);
  let dist = Math.abs(a.length - b.length) * 4;
  for (let i = 0; i < shorter; i++) {
    let xor = parseInt((_a = a[i]) != null ? _a : "0", 16) ^ parseInt((_b = b[i]) != null ? _b : "0", 16);
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
function dhashGrayscale(pixels, width, height) {
  var _a, _b;
  let bits = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const left = (_a = pixels[y * width + x]) != null ? _a : 0;
      const right = (_b = pixels[y * width + x + 1]) != null ? _b : 0;
      bits += left > right ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = bits.slice(i, i + 4).padEnd(4, "0");
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex;
}
function findNearDuplicate(hash, seen, maxDistance = NEAR_DUPLICATE_DISTANCE) {
  if (!hash) return null;
  let best = null;
  for (const s of seen) {
    const distance = hammingDistanceHex(hash, s.hash);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { ...s, distance };
    }
  }
  return best;
}
export {
  COSMETIC_AREAS2 as COSMETIC_AREAS,
  COSMETIC_SEVERITIES2 as COSMETIC_SEVERITIES,
  DAMAGE_TYPE_VALUES,
  M1_DENT_PROMPT_VERSION,
  NEAR_DUPLICATE_DISTANCE,
  PANEL_GROUPS,
  PANEL_LABELS,
  PHOTO_CAPTURE_GUIDANCE,
  POOR_LIGHTING_GUIDANCE,
  STEP_ORDER,
  buildAiFinding,
  buildCanonicalProfile,
  buildFinalValuationRequest,
  buildItemLabelMap,
  buildMissingList,
  buildPricingSummary,
  buildProgress,
  collectAngleFindings,
  crossValidateVehicle,
  decideForSavedSeverity,
  dhashGrayscale,
  explainIntegrityFailure,
  findNearDuplicate,
  findingToShotRead,
  humanizeSubmitError,
  isDocumentItem,
  isEvidenceOnlyItem,
  isPhotoGridItem,
  isVideoItem,
  mapAiSeverityToAnswer,
  newestFindingFor,
  normalizeDamageResult,
  parseOdometerKm,
  parseOwnerCount,
  partitionItems,
  photoGroups,
  photoSlots,
  resolveShotDisplayName,
  selectFinalValuationCard,
  shotLabel,
  stepForItem,
  toDamageVehicleContext
};
