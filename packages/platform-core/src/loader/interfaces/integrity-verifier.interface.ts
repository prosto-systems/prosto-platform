import type { RuntimeReasonCodes } from '@/runtime/index.js';
import type { IDiscoveredModuleArtifact } from './discovered-module-artifact.interface.js';

export type IntegrityVerificationResultType =
  | { ok: true }
  | {
  ok: false;
  error: {
    reasonCode: RuntimeReasonCodes;
    message: string;
    remediationHint: string;
  };
};

/**
 * @deprecated
 * Integrity verifier contract used by module loading flow.
 */
export interface IIntegrityVerifier {
  verify(artifact: IDiscoveredModuleArtifact): Promise<IntegrityVerificationResultType>;
}
