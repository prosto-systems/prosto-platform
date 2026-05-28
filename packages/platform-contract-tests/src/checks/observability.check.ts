import type { IPlatformModuleManifest } from '@prosto/platform-sdk';
import type { IContractCheckResult } from '@/interfaces/index.js';
import { ContractFailureCodes } from '@/constants/index.js';

const OBSERVABILITY_PREFIX = 'obs.';
export const OBSERVABILITY_CHECK_RESULT_ID = 'observability-metadata';

/**
 * @alpha
 * Verifies minimum observability capability contract.
 */
export function runObservabilityConformanceCheck(
  manifest: IPlatformModuleManifest,
): IContractCheckResult {
  const hasObservabilityCapability = manifest.capabilities.some((capability) =>
    capability.startsWith(OBSERVABILITY_PREFIX),
  );

  if (!hasObservabilityCapability) {
    return {
      id: OBSERVABILITY_CHECK_RESULT_ID,
      title: 'Observability metadata minimum contract',
      severity: 'advisory',
      passed: false,
      code: ContractFailureCodes.ObservabilityCapabilityMissing,
      details:
        'Manifest should declare at least one capability under the "obs." namespace.',
    };
  }

  return {
    id: OBSERVABILITY_CHECK_RESULT_ID,
    title: 'Observability metadata minimum contract',
    severity: 'mandatory',
    passed: true,
    code: null,
    details: 'Observability capability contract is satisfied.',
  };
}
