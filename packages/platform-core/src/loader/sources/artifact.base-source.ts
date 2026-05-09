import type { RuntimeReasonCodes } from '@/runtime/index.js';
import type { ModuleArtifactSource } from '../constants/index.js';
import type {
  ArtifactSourceValidationResultType,
  IArtifactSource,
  IModuleCandidateArtifact,
  IRejectedModuleArtifact,
} from '../interfaces/index.js';

/**
 * @alpha
 * Abstract base class for artifact sources.
 */
export abstract class ArtifactBaseSource implements IArtifactSource {
  constructor(private readonly _sourceType: ModuleArtifactSource) {
  }

  /**
   * Source type identifier (public for interface compliance).
   */
  get type(): ModuleArtifactSource {
    return this._sourceType;
  }

  /**
   * Validate source configuration before loading.
   */
  abstract validate(): ArtifactSourceValidationResultType;

  /**
   * Load module artifact from the source.
   */
  abstract load(): Promise<IModuleCandidateArtifact | IRejectedModuleArtifact>;

  /**
   * Get module ID hint from source.
   */
  protected abstract getModuleIdHint(): string | undefined;

  /**
   * Get a source reference string.
   */
  protected abstract getSourceRef(): string;

  /**
   * Helper to create a rejected artifact with common fields.
   */
  protected createRejected(
    phase: IRejectedModuleArtifact['phase'],
    details: {
      reasonCode: RuntimeReasonCodes;
      message: string;
      remediationHint: string;
    },
  ): IRejectedModuleArtifact {
    return {
      phase,
      moduleId: this.getModuleIdHint() || 'unknown',
      sourceType: this._sourceType,
      sourceRef: this.getSourceRef(),
      reasonCode: details.reasonCode,
      message: details.message,
      remediationHint: details.remediationHint,
    };
  }
}
