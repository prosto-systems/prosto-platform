import type {
  ArtifactSourceValidationResultType,
  IModuleCandidateArtifact,
  IModuleRegistryArtifactSource,
  IRejectedModuleArtifact,
} from '../interfaces/index.js';
import { RuntimeReasonCodes } from '@/runtime/index.js';
import { ModuleArtifactSource } from '../constants/index.js';
import { ArtifactBaseSource } from './artifact.base-source.js';

/**
 * @alpha
 * Package registry-based artifact source (npm, etc.).
 */
export class RegistrySource extends ArtifactBaseSource {
  constructor(private readonly _descriptor: IModuleRegistryArtifactSource) {
    super(ModuleArtifactSource.Registry);
  }

  /**
   * Validate registry source configuration.
   */
  override validate(): ArtifactSourceValidationResultType {
    if (!this._descriptor.packageName.trim() || !this._descriptor.version.trim()) {
      return {
        ok: false,
        error: {
          reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
          message: 'Registry source requires non-empty packageName and version.',
          remediationHint: 'Provide registry package coordinates for registry source.',
        },
      };
    }

    return { ok: true };
  }

  /**
   * Load artifact from a registry.
   * Currently, returns rejected as registry resolution are not implemented.
   */
  override async load(): Promise<IModuleCandidateArtifact | IRejectedModuleArtifact> {
    const validation = this.validate();

    if (!validation.ok) {
      return this.createRejected('discover', validation.error);
    }

    // TODO: Implement registry resolution adapter for registry source

    /*
    const registryRef = `${this._descriptor.packageName}@${this._descriptor.version}`;
    const artifact: IModuleCandidateArtifact = {
      module,
      moduleId: module.manifest.id,
      moduleVersion: module.manifest.version,
      orderingKey: `registry:${registryRef}`,
      sourceType: ModuleArtifactSource.Registry,
      sourceRef: registryRef,
      packaging: this._descriptor.packaging ?? ModuleArtifactPackaging.Tgz,
    };
    */

    return this.createRejected('validate', {
      reasonCode: RuntimeReasonCodes.SourceFetchFailed,
      message: 'Registry source adapter is not implemented yet.',
      remediationHint: 'Implement registry resolution adapter for registry source.',
    });
  }

  protected override getModuleIdHint(): string | undefined {
    return this._descriptor.moduleIdHint;
  }

  protected override getSourceRef(): string {
    return `${this._descriptor.packageName}@${this._descriptor.version}`;
  }
}
