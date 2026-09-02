/**
 * @alpha
 * Enum representing the different sources for module artifacts.
 */
export enum ModuleArtifactSource {
  Memory = 'memory',
  Path = 'path',
  Url = 'url',
  Registry = 'registry',
}

/**
 * @alpha
 * Enum representing the different packaging formats for module artifacts.
 */
export enum ModuleArtifactPackaging {
  Zip = 'zip',
  Tgz = 'tgz',
  Esm = 'esm',
}
