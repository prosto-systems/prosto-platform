import type {
  IContractTestRunnerApi,
  IModuleContractConformanceReport,
  IModuleContractTestInput,
} from './types/index.js';
import { PlatformModuleManifestValidator } from '@prosto/platform-sdk';
import {
  CAPABILITY_CHECK_RESULT_ID,
  LIFECYCLE_CHECK_RESULT_ID,
  MANIFEST_CHECK_RESULT_ID,
  OBSERVABILITY_CHECK_RESULT_ID,
  runCapabilityConformanceCheck,
  runLifecycleConformanceCheck,
  runManifestConformanceCheck,
  runObservabilityConformanceCheck,
  runSecurityMetadataConformanceCheck,
  SECURITY_CHECK_RESULT_ID,
} from './checks/index.js';
import { DefaultModuleLifecycleContextFactory } from './factories/index.js';
import { buildConformanceReport } from './utils/index.js';

/**
 * @alpha
 * Executes full module contract conformance suite and returns machine-readable report.
 */
export async function runModuleContractConformance(
  input: IModuleContractTestInput,
): Promise<IModuleContractConformanceReport> {
  return buildConformanceReport({
    moduleId: input.module.manifest.id,
    moduleVersion: input.module.manifest.version,
    generatedAt: input.now?.() ?? new Date().toISOString(),
    checks: [
      runManifestConformanceCheck({
        manifest: input.module.manifest,
        manifestValidator:
          input.manifestValidator ?? new PlatformModuleManifestValidator(),
      }),
      await runLifecycleConformanceCheck({
        module: input.module,
        moduleLifecycleContextFactory:
          input.moduleLifecycleContextFactory ??
          new DefaultModuleLifecycleContextFactory(),
      }),
      runCapabilityConformanceCheck(input.module.manifest),
      runSecurityMetadataConformanceCheck(input.module.manifest),
      runObservabilityConformanceCheck(input.module.manifest),
    ],
  });
}

/**
 * @alpha
 * Reusable test-entry helper for module repositories.
 */
export function createModuleContractTests(
  input: IModuleContractTestInput,
  runner: IContractTestRunnerApi,
): void {
  // Start all checks once; shared promise across all tests
  const checksMapPromise = runModuleContractConformance(input).then(
    ({ checks }) => new Map(checks.map((check) => [check.id, check])),
  );

  runner.describe('manifest', () => {
    runner.it('should satisfy schema and semantic constraints', async () => {
      const check = (await checksMapPromise).get(MANIFEST_CHECK_RESULT_ID);

      if (!check?.passed) {
        throw new Error(check?.details ?? 'Manifest conformance check failed.');
      }
    });
  });

  runner.describe('lifecycle', () => {
    runner.it(
      'should expose register/init/start/stop and execute successfully',
      async () => {
        const check = (await checksMapPromise).get(LIFECYCLE_CHECK_RESULT_ID);

        if (!check?.passed) {
          throw new Error(
            check?.details ?? 'Lifecycle conformance check failed.',
          );
        }
      },
    );
  });

  runner.describe('capabilities', () => {
    runner.it('should satisfy capability declaration integrity', async () => {
      const check = (await checksMapPromise).get(CAPABILITY_CHECK_RESULT_ID);

      if (!check?.passed) {
        throw new Error(
          check?.details ?? 'Capability conformance check failed.',
        );
      }
    });
  });

  runner.describe('security metadata', () => {
    runner.it('should include required security metadata', async () => {
      const check = (await checksMapPromise).get(SECURITY_CHECK_RESULT_ID);

      if (!check?.passed && check?.severity === 'mandatory') {
        throw new Error(check.details);
      }
    });
  });

  runner.describe('observability metadata', () => {
    runner.it('should satisfy minimum observability contract', async () => {
      const check = (await checksMapPromise).get(OBSERVABILITY_CHECK_RESULT_ID);

      if (!check?.passed && check?.severity === 'mandatory') {
        throw new Error(check.details);
      }
    });
  });
}
