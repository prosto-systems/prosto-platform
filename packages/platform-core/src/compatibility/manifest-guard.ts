import type { IPlatformModuleManifest } from '@prosto/platform-sdk';
import { safeValidatePlatformModuleManifest } from '@prosto/platform-sdk';
import type {
  IRuntimeFailureDiagnostic,
} from '../diagnostics/diagnostics.types.js';
import { RuntimeReasonCodes } from './reason-codes.js';

export interface IManifestGuardResult {
  readonly ok: boolean;
  readonly manifest?: IPlatformModuleManifest;
  readonly error?: IRuntimeFailureDiagnostic;
}

export function guardManifest(
  moduleId: string,
  manifest: unknown,
): IManifestGuardResult {
  const validation = safeValidatePlatformModuleManifest(manifest);

  if (validation.success) {
    return {
      ok: true,
      manifest: validation.manifest,
    };
  }

  return {
    ok: false,
    error: {
      moduleId,
      phase: 'validate',
      errorCode: RuntimeReasonCodes.ManifestInvalid,
      message: validation.error.message,
      remediationHint: 'Fix module manifest according to @prosto/platform-sdk schema and semantic rules.',
    },
  };
}
