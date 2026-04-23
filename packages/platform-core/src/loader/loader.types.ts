import type { IPlatformModule } from '@prosto/platform-sdk';
import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';

export interface IModuleCandidateArtifact {
  readonly module: IPlatformModule;
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly orderingKey: string;
}

export interface IRejectedModuleArtifact {
  readonly moduleId: string;
  readonly reasonCode: RuntimeReasonCodeType;
  readonly message: string;
}

export interface IModuleDiscoveryResult {
  readonly candidates: readonly IModuleCandidateArtifact[];
  readonly rejected: readonly IRejectedModuleArtifact[];
}
