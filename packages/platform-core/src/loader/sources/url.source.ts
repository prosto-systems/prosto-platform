import type {
  ArtifactSourceValidationResultType,
  IModuleCandidateArtifact,
  IModuleUrlArtifactSource,
  IRejectedModuleArtifact,
} from '../interfaces/index.js';
import { RuntimeReasonCodes } from '@/runtime/index.js';
import { ModuleArtifactSource } from '../constants/index.js';
import { ArtifactBaseSource } from './artifact.base-source.js';

/**
 * @alpha
 * HTTPS URL-based artifact source.
 */
export class UrlSource extends ArtifactBaseSource {
  constructor(private readonly _descriptor: IModuleUrlArtifactSource) {
    super(ModuleArtifactSource.Url);
  }

  /**
   * Validate URL source configuration.
   */
  override validate(): ArtifactSourceValidationResultType {
    if (!this._descriptor.url.trim()) {
      return {
        ok: false,
        error: {
          reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
          message: 'Artifact URL source descriptor is empty.',
          remediationHint: 'Provide non-empty HTTPS URL for url source.'
        },
      };
    }

    const isHttps = this._descriptor.url.startsWith('https://');

    if (!isHttps) {
      return {
        ok: false,
        error: {
          reasonCode: RuntimeReasonCodes.SourceUrlInvalid,
          message: 'Artifact URL must use HTTPS.',
          remediationHint: 'Use HTTPS artifact URL in source descriptor.'
        },
      };
    }

    return { ok: true };
  }

  /**
   * Load artifact from URL.
   * Currently returns rejected as HTTPS fetch is not implemented.
   */
  override async load(): Promise<IModuleCandidateArtifact | IRejectedModuleArtifact> {
    const validation = this.validate();

    if (!validation.ok) {
      return this.createRejected('discover', validation.error);
    }

    // TODO: Implement HTTPS fetch adapter for URL source

    /*
    const artifact: IModuleCandidateArtifact = {
      module,
      moduleId: module.manifest.id,
      moduleVersion: module.manifest.version,
      orderingKey: `url:${this._descriptor.url}`,
      sourceType: ModuleArtifactSource.Url,
      sourceRef: this._descriptor.url,
      packaging: this._descriptor.packaging ?? ModuleArtifactPackaging.Zip,
    };
    */

    return this.createRejected('validate', {
      reasonCode: RuntimeReasonCodes.SourceFetchFailed,
      message: 'URL source adapter is not implemented yet.',
      remediationHint: 'Implement HTTPS fetch adapter for URL source.',
    });
  }

  protected override getModuleIdHint(): string | undefined {
    return this._descriptor.moduleIdHint;
  }

  protected override getSourceRef(): string {
    return this._descriptor.url;
  }
}
