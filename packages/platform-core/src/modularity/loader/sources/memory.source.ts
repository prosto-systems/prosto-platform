import type {
  ArtifactSourceValidationResultType,
  IModuleCandidateArtifact,
  IModuleMemoryArtifactSource,
  IRejectedModuleArtifact,
} from '../interfaces/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import {
  ModuleArtifactPackaging,
  ModuleArtifactSource,
} from '../constants/index.js';
import { ArtifactBaseSource } from './artifact.base-source.js';

/**
 * @alpha
 * Memory-based artifact source for in-memory module instances.
 */
export class MemorySource extends ArtifactBaseSource {
  constructor(private readonly _descriptor: IModuleMemoryArtifactSource) {
    super(ModuleArtifactSource.Memory);
  }

  /**
   * Memory sources are always valid if a module instance exists.
   */
  override validate(): ArtifactSourceValidationResultType {
    if (!this._descriptor.module) {
      return {
        ok: false,
        error: {
          reasonCode: RuntimeErrorCodes.SourceEntryResolveFailed,
          message: 'Memory source artifact does not contain module instance.',
          remediationHint: 'Provide module object for memory source.',
        },
      };
    }

    return { ok: true };
  }

  /**
   * Load module from memory - returns immediately with normalized artifact.
   */
  override async load(): Promise<
    IModuleCandidateArtifact | IRejectedModuleArtifact
  > {
    const validation = this.validate();

    if (!validation.ok) {
      return this.createRejected('discover', validation.error);
    }

    const module = this._descriptor.module;

    const artifact: IModuleCandidateArtifact = {
      module,
      moduleId: module.manifest.id,
      moduleVersion: module.manifest.version,
      orderingKey: `memory:${module.manifest.id}@${module.manifest.version}`,
      sourceType: ModuleArtifactSource.Memory,
      sourceRef: `memory:${module.manifest.id}@${module.manifest.version}`,
      packaging: ModuleArtifactPackaging.Esm,
    };

    return artifact;
  }

  protected override getModuleIdHint(): string | undefined {
    return (
      this._descriptor.module?.manifest.id ?? this._descriptor.moduleIdHint
    );
  }

  protected override getSourceRef(): string {
    const module = this._descriptor.module;

    return module
      ? `memory:${module.manifest.id}@${module.manifest.version}`
      : 'memory:unknown';
  }
}
