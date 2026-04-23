import {
  type IPlatformRuntimeVersionContext,
  validateManifestCompatibility,
} from '@prosto/platform-sdk';
import type { IPlatformModule } from '@prosto/platform-sdk';
import type { IRuntimeFailureDiagnostic } from '../diagnostics/diagnostics.types.js';
import { RuntimeReasonCodes } from './reason-codes.js';

export interface ICompatibilityCheckerResult {
  readonly compatible: boolean;
  readonly error?: IRuntimeFailureDiagnostic;
}

export function checkModuleCompatibility(
  module: IPlatformModule,
  runtimeVersion: IPlatformRuntimeVersionContext,
): ICompatibilityCheckerResult {
  const result = validateManifestCompatibility(module.manifest, runtimeVersion);

  if (result.compatible) {
    return { compatible: true };
  }

  const firstIssue = result.issues[0];

  return {
    compatible: false,
    error: {
      moduleId: module.manifest.id,
      phase: 'validate',
      errorCode: RuntimeReasonCodes.CompatibilityMismatch,
      message: firstIssue
        ? `${firstIssue.message} (field: ${firstIssue.field})`
        : 'Compatibility mismatch detected.',
      remediationHint:
        'Adjust module sdkVersion/nodeVersion ranges or runtime versions to satisfy compatibility constraints.',
    },
  };
}
