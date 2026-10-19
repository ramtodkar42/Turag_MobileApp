// Builds src/vendor/selfInspectionLogic.js: the web (turag.ai) self-inspection
// logic compiled into one plain-JS module, so the app runs EXACTLY the same
// rules as the web - step grouping, "X of Y done" progress, the submit
// checklist ("what's left"), the AI damage gate / finding shape and the live
// estimate's pricing engine. Nothing is hand-copied.
//
// Run after the web's self-inspection logic changes:
//   node scripts/build-self-inspection-logic.mjs "D:\TuragAI\turag-platform-main (6)\turag-platform-main"
// (or set TURAG_PLATFORM_DIR). Needs the platform repo's node_modules installed.
// The platform repo is only read - nothing is written there.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const platformDir = process.argv[2] ?? process.env.TURAG_PLATFORM_DIR;
if (!platformDir || !existsSync(path.join(platformDir, 'apps', 'web'))) {
  console.error('Pass the turag-platform repo folder (or set TURAG_PLATFORM_DIR).');
  process.exit(1);
}
const webDir = path.join(platformDir, 'apps', 'web');
const inspectDir = path.join(webDir, 'src', 'app', 'inspect', '[id]');
const require = createRequire(path.join(webDir, 'package.json'));

// esbuild comes with the platform's tooling: a direct dependency, or (pnpm)
// inside node_modules/.pnpm - use the newest one there.
const loadEsbuild = () => {
  try {
    return require('esbuild');
  } catch {
    const store = path.join(platformDir, 'node_modules', '.pnpm');
    const versions = readdirSync(store)
      .filter(name => /^esbuild@\d/.test(name))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    if (!versions.length) {
      throw new Error('esbuild not found in the platform repo - run pnpm install there.');
    }
    return createRequire(path.join(store, versions[0], 'node_modules', 'esbuild', 'package.json'))('esbuild');
  }
};
const esbuild = loadEsbuild();

// Everything the mobile self-inspection screen uses from the web.
const entry = `
export { STEP_ORDER, partitionItems, photoGroups, photoSlots, buildMissingList, buildProgress, isDocumentItem, isPhotoGridItem, isVideoItem, isEvidenceOnlyItem, shotLabel, stepForItem } from './self-inspection-steps';
export { parseOdometerKm, parseOwnerCount } from './numeric-confirm';
export { normalizeDamageResult, DAMAGE_TYPE_VALUES } from './damage-gate';
export { M1_DENT_PROMPT_VERSION } from './m1-prompts';
export { buildAiFinding, findingToShotRead } from './ai-finding';
export { decideForSavedSeverity, mapAiSeverityToAnswer, newestFindingFor } from './ai-decision';
export { collectAngleFindings } from './angle-findings';
export { crossValidateVehicle } from './cross-validate';
export { buildCanonicalProfile } from './vehicle-profile';
export { buildPricingSummary } from './pricing-summary';
export { toDamageVehicleContext } from './vehicle-context';
export { PHOTO_CAPTURE_GUIDANCE, POOR_LIGHTING_GUIDANCE } from './photo-quality';
export { buildItemLabelMap, humanizeSubmitError, resolveShotDisplayName } from '@/lib/inspection-display-names';
export { explainIntegrityFailure } from '@/lib/integrity-reasons';
export { buildFinalValuationRequest, selectFinalValuationCard } from '@/lib/final-valuation-card';
export { COSMETIC_AREAS, COSMETIC_SEVERITIES } from '@/lib/condition';
export { PANEL_GROUPS, PANEL_LABELS } from '@turag/core/pricing';
`;

const result = await esbuild.build({
  stdin: { contents: entry, resolveDir: inspectDir, sourcefile: 'mobile-entry.ts', loader: 'ts' },
  absWorkingDir: webDir,
  tsconfig: path.join(webDir, 'tsconfig.json'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  target: 'es2019',
  write: false,
  logLevel: 'warning',
});

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'src', 'vendor', 'selfInspectionLogic.js');
const webPkg = JSON.parse(readFileSync(path.join(webDir, 'package.json'), 'utf8'));
const header = `/* eslint-disable */
// GENERATED - do not edit. The web (turag.ai) self-inspection logic, compiled
// by scripts/build-self-inspection-logic.mjs from ${webPkg.name ?? 'apps/web'}
// (src/app/inspect/[id]/* and @turag/core/pricing). Rebuild with that script.
`;
writeFileSync(out, header + result.outputFiles[0].text);
console.log(`Wrote ${path.relative(process.cwd(), out)} (${Math.round(result.outputFiles[0].text.length / 1024)} KB)`);
