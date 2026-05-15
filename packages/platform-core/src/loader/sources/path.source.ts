import type {
  ArtifactSourceValidationResultType,
  IModuleCandidateArtifact,
  IModulePathArtifactSource,
  IRejectedModuleArtifact,
} from '../interfaces/index.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RuntimeReasonCodes } from '@/runtime/index.js';
import { ModuleArtifactSource } from '../constants/index.js';
import { ArtifactBaseSource } from './artifact.base-source.js';

/**
 * @alpha
 * File system path-based artifact source.
 */
export class PathSource extends ArtifactBaseSource {
  constructor(private readonly _descriptor: IModulePathArtifactSource) {
    super(ModuleArtifactSource.Path);
  }

  /**
   * Validate path source configuration.
   */
  override validate(): ArtifactSourceValidationResultType {
    if (!this._descriptor.path.trim()) {
      return {
        ok: false,
        error: {
          reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
          message: 'Artifact path source descriptor is empty.',
          remediationHint: 'Provide non-empty filesystem path for path source.',
        },
      };
    }

    return { ok: true };
  }

  /**
   * Load and verify integrity of path-based artifact.
   * Currently, returns rejected as extraction is not implemented.
   */
  override async load(): Promise<IModuleCandidateArtifact | IRejectedModuleArtifact> {
    const validation = this.validate();

    if (!validation.ok) {
      return this.createRejected('discover', validation.error);
    }

    const checksum = this._descriptor.integrity?.checksum;

    if (!checksum) {
      return this.createRejected('validate', {
        reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
        message: 'Missing checksum for path artifact source.',
        remediationHint: 'Provide checksum in source.integrity.checksum for path source.',
      });
    }

    const parsed = this.parseChecksum(checksum);

    if (!parsed) {
      return this.createRejected('validate', {
        reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
        message: 'Unsupported checksum format for path source.',
        remediationHint: 'Use sha256:<hex> or <hex> checksum format.',
      });
    }

    if (parsed.algorithm !== 'sha256') {
      return this.createRejected('validate', {
        reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
        message: `Unsupported checksum algorithm "${parsed.algorithm}" for path source.`,
        remediationHint: 'Use sha256 checksum for path source.',
      });
    }

    let payload: Buffer;

    try {
      payload = await readFile(this._descriptor.path);
    } catch (error) {
      return this.createRejected('validate', {
        reasonCode: RuntimeReasonCodes.SourceFetchFailed,
        message: `Unable to read artifact from path source: ${error instanceof Error ? error.message : 'unknown error'}`,
        remediationHint: 'Ensure file exists and runtime has read permissions.',
      });
    }

    const actual = createHash('sha256').update(payload).digest('hex');

    if (actual !== parsed.value) {
      return this.createRejected('validate', {
        reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
        message: 'Path source checksum mismatch.',
        remediationHint: 'Update checksum metadata or artifact payload to match expected integrity.',
      });
    }

    // TODO: Implement path extraction and module entry resolution

    /*
    const artifact: IModuleCandidateArtifact = {
      module,
      moduleId: module.manifest.id,
      moduleVersion: module.manifest.version,
      orderingKey: `path:${this._descriptor.path}`,
      sourceType: ModuleArtifactSource.Path,
      sourceRef: this._descriptor.path,
      packaging: this._descriptor.packaging ?? ModuleArtifactPackaging.Zip,
    };
    */

    return this.createRejected('validate', {
      reasonCode: RuntimeReasonCodes.SourceEntryResolveFailed,
      message: 'Path source artifact verified but runtime entry resolution is not implemented yet.',
      remediationHint: 'Enable path extraction and module entry resolution in loader implementation.',
    });
  }

  protected override getModuleIdHint(): string | undefined {
    return this._descriptor.moduleIdHint;
  }

  protected override getSourceRef(): string {
    return this._descriptor.path;
  }

  private parseChecksum(input: string): {
    algorithm: string;
    value: string
  } | null {
    const normalized = input.trim();

    if (!normalized) return null;

    const [algorithm, value] = normalized.split(':');

    if (algorithm && value) {
      return {
        algorithm: algorithm.toLowerCase(),
        value: value.toLowerCase(),
      };
    }

    if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
      return {
        algorithm: 'sha256',
        value: normalized.toLowerCase(),
      };
    }

    return null;
  }
}
