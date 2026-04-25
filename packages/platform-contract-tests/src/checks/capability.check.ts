import type { IPlatformModuleManifest } from '@prosto/platform-sdk';
import {
  ContractFailureCodes,
  type IContractCheckResult,
} from '../types/index.js';

const MANDATORY_CAPABILITIES = ['lifecycle.register', 'lifecycle.start'] as const;

export const CAPABILITY_CHECK_RESULT_ID = 'capability-conformance'

/**
 * beta
 * Verifies capability declaration integrity and mandatory lifecycle capabilities.
 */
export function runCapabilityConformanceCheck(
  manifest: IPlatformModuleManifest,
): IContractCheckResult {
  const { capabilities } = manifest;
  const uniqueCapabilities = new Set(capabilities);

  if (uniqueCapabilities.size !== capabilities.length) {
    return {
      id: CAPABILITY_CHECK_RESULT_ID,
      title: 'Capability declaration integrity',
      severity: 'mandatory',
      passed: false,
      code: ContractFailureCodes.CapabilityDuplicate,
      details: 'Manifest contains duplicate capability declarations.',
    };
  }

  const missingMandatoryCapabilities = MANDATORY_CAPABILITIES.filter(
    (capability) => !uniqueCapabilities.has(capability),
  );

  if (missingMandatoryCapabilities.length) {
    return {
      id: CAPABILITY_CHECK_RESULT_ID,
      title: 'Capability declaration integrity',
      severity: 'mandatory',
      passed: false,
      code: ContractFailureCodes.CapabilityMissing,
      details: `Missing required capabilities: ${missingMandatoryCapabilities.join(', ')}`,
    };
  }

  return {
    id: CAPABILITY_CHECK_RESULT_ID,
    title: 'Capability declaration integrity',
    severity: 'mandatory',
    passed: true,
    code: null,
    details: 'Capability declarations are unique and include required lifecycle capabilities.',
  };
}
