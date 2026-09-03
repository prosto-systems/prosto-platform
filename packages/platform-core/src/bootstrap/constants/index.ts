/**
 * @alpha
 * Enum representing the different stages of the bootstrap process.
 */
export enum BootstrapStage {
  Discover = 'discover',
  Validate = 'validate',
  Resolve = 'resolve',
  Copy = 'copy',
  Load = 'load',
  Initialize = 'initialize',
  Persistence = 'persistence',
  Start = 'start',
}
