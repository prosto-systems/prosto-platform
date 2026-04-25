import type {
  IModuleCompatibilityValidator,
  IPlatformModule,
  IPlatformRuntimeVersionContext,
} from '@prosto/platform-sdk';
import type {
  IRuntimeFailureDiagnostic,
} from '../diagnostics/diagnostics.types.js';
import { RuntimeReasonCodes } from './reason-codes.js';

export interface ICompatibilityCheckerResult {
  readonly compatible: boolean;
  readonly error?: IRuntimeFailureDiagnostic;
}

export function checkModuleCompatibility(
  module: IPlatformModule,
  runtimeVersion: IPlatformRuntimeVersionContext,
  compatibilityValidator: IModuleCompatibilityValidator,
): ICompatibilityCheckerResult {
  const result = compatibilityValidator.validate(module.manifest, runtimeVersion);

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
