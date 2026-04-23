import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';
import type {
  IRejectedModuleArtifact,
  ModuleArtifactSourceType,
} from './loader.types.js';

export interface ICreateRejectedInput {
  readonly moduleId: string;
  readonly sourceType: ModuleArtifactSourceType;
  readonly sourceRef: string;
  readonly reasonCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export function createRejected(
  phase: IRejectedModuleArtifact['phase'],
  input: ICreateRejectedInput,
): IRejectedModuleArtifact {
  return {
    phase,
    moduleId: input.moduleId,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    reasonCode: input.reasonCode,
    message: input.message,
    remediationHint: input.remediationHint,
  };
}
