import type {
  IArtifactSource,
  IArtifactSourceFactory,
  ModuleArtifactSourceDescriptorType,
} from '../interfaces/index.js';
import type { IModuleArtifactHttpClient } from '../utils/index.js';
import {
  MemorySource,
  PathSource,
  RegistrySource,
  UrlSource,
} from '../sources/index.js';

/**
 * @alpha
 * Factory for creating artifact sources based on descriptor type.
 */
export class ArtifactSourceFactory implements IArtifactSourceFactory {
  constructor(private readonly _httpClient?: IModuleArtifactHttpClient) {}

  create(descriptor: ModuleArtifactSourceDescriptorType): IArtifactSource {
    switch (descriptor.type) {
      case 'memory':
        return new MemorySource(descriptor);

      case 'path':
        return new PathSource(descriptor);

      case 'url':
        return new UrlSource(descriptor, this._httpClient);

      case 'registry':
        return new RegistrySource(descriptor, this._httpClient);

      default: {
        const _exhaustiveCheck: never = descriptor;
        return _exhaustiveCheck;
      }
    }
  }
}
