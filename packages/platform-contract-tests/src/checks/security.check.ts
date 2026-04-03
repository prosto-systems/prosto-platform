import type { IPlatformModuleManifest } from '@prosto/platform-sdk';
import { ContractFailureCodes, type IContractCheckResult } from '../types/index.js';

export const SECURITY_CHECK_RESULT_ID = 'security-metadata';

/**
 * @stable
 * Verifies required security metadata in module manifest.
 */
export function runSecurityMetadataConformanceCheck(
  manifest: IPlatformModuleManifest,
): IContractCheckResult {
  if (!manifest.securityClass) {
    return {
      id: SECURITY_CHECK_RESULT_ID,
      title: 'Security metadata presence',
      severity: 'mandatory',
      passed: false,
      code: ContractFailureCodes.SecurityClassMissing,
      details: 'Manifest must provide securityClass metadata.',
    };
  }

  if (!manifest.signature && !manifest.checksum) {
    return {
      id: SECURITY_CHECK_RESULT_ID,
      title: 'Security metadata presence',
      severity: 'advisory',
      passed: false,
      code: ContractFailureCodes.SecuritySignatureOrChecksumMissing,
      details: 'Manifest should provide checksum or signature metadata for artifact integrity.',
    };
  }

  return {
    id: SECURITY_CHECK_RESULT_ID,
    title: 'Security metadata presence',
    severity: 'mandatory',
    passed: true,
    code: null,
    details: 'Required security metadata is present.',
  };
}
