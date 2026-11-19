import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { onboardingFixture } from './directory-onboarding-fixture.mjs';
import { measureChrome } from './chrome-layout.mjs';

// Keep evidence outside the repository and isolate Chrome from existing servers/profiles.
const evidence = 'C:/Users/yasas/AppData/Local/hermes/cache/scratch/fyndo-expansion/ui/help-fix';
test('mounted Home Help replays the optional tour without resetting directory state', async () => {
  const directory = join(evidence, `run-${process.pid}-${Date.now()}`);
  await mkdir(directory, { recursive: true });
  const { fixture } = await onboardingFixture(directory);
  const report = await measureChrome(fixture, join(directory, 'chrome-profile'), 1280);
  await writeFile(join(directory, 'interaction-report.json'), JSON.stringify(report, null, 2));
  console.log(`Help replay browser evidence: ${directory}`);
  assert.equal(report.failure, undefined, report.failure);
  assert.deepEqual(report.errors, []);
  assert.ok(report.checks.includes('Help after initially mounted Home opens tour'));
  assert.ok(report.checks.includes('Help replays on direct tour=1 visit'));
});
