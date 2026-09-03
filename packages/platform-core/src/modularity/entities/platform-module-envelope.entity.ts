import type {
  IPlatformModule,
  IPlatformModuleDependency,
  IPlatformModuleIncompatibility,
  IPlatformModuleManifest,
  ModuleIdentifierType,
  SemverRangeType,
  SemverVersionType,
} from '@prosto/platform-sdk';
import { ModuleState } from '../constants/index.js';

/**
 * @alpha
 * Mutable runtime envelope for immutable module manifest metadata.
 *
 * The envelope retains the canonical manifest fields while tracking the
 * discovery path, probing reference, loaded module instance, installation
 * state, and lifecycle state used by the bootstrap pipeline.
 */
export class PlatformModuleEnvelope implements IPlatformModuleManifest {
  public readonly id: ModuleIdentifierType;
  public readonly version: SemverVersionType;
  public readonly sdkVersion: SemverRangeType;
  public readonly nodeVersion?: SemverRangeType;
  public readonly title: string;
  public readonly description?: string;
  public readonly optional?: boolean;
  public readonly iconUrl?: string;
  public readonly projectUrl?: string;
  public readonly dependencies: readonly IPlatformModuleDependency[] = [];
  public readonly incompatibilities?: readonly IPlatformModuleIncompatibility[];
  public readonly groups?: readonly string[];
  public readonly tags?: readonly string[];
  public readonly authors?: readonly string[];
  public readonly owners?: readonly string[];
  public readonly copyright?: string;

  public isInstalled = false;
  public fullPhysicalPath = '';
  public ref = '';
  public state: ModuleState = ModuleState.NotInitialized;
  public moduleInstance?: IPlatformModule;

  constructor(manifest: IPlatformModuleManifest) {
    this.id = manifest.id;
    this.version = manifest.version;
    this.sdkVersion = manifest.sdkVersion;
    this.nodeVersion = manifest.nodeVersion;
    this.title = manifest.title;
    this.description = manifest.description;
    this.optional = manifest.optional;
    this.iconUrl = manifest.iconUrl;
    this.projectUrl = manifest.projectUrl;
    this.dependencies = manifest.dependencies;
    this.incompatibilities = manifest.incompatibilities;
    this.groups = manifest.groups;
    this.tags = manifest.tags;
    this.authors = manifest.authors;
    this.owners = manifest.owners;
    this.copyright = manifest.copyright;
  }

  /**
   * Returns a manifest-only snapshot without runtime state or module code.
   */
  toManifest(): IPlatformModuleManifest {
    return {
      id: this.id,
      version: this.version,
      sdkVersion: this.sdkVersion,
      nodeVersion: this.nodeVersion,
      title: this.title,
      description: this.description,
      optional: this.optional,
      iconUrl: this.iconUrl,
      projectUrl: this.projectUrl,
      dependencies: this.dependencies,
      incompatibilities: this.incompatibilities,
      groups: this.groups,
      tags: this.tags,
      authors: this.authors,
      owners: this.owners,
      copyright: this.copyright,
    };
  }

  /**
   * Returns the canonical `<module-id>@<version>` identity.
   */
  toString(): string {
    return `${this.id}@${this.version}`;
  }

  /**
   * Returns a deterministic 32-bit hash for this module.
   */
  public getHashCode(): number {
    const identity = this.toString();
    let hash = 0;

    for (let index = 0; index < identity.length; index += 1) {
      hash = ((hash << 5) - hash + identity.charCodeAt(index)) | 0;
    }

    return hash;
  }
}
