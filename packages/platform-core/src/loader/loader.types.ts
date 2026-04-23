import type { IPlatformModule } from '@prosto/platform-sdk';
import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';

export type ModuleArtifactPackagingType = 'zip' | 'tgz' | 'esm';
export type ModuleArtifactSourceType = 'memory' | 'path' | 'url' | 'registry';

export interface IModuleArtifactIntegrity {
  readonly checksum?: string;
  readonly signature?: string;
}

export interface IModulePathArtifactSource {
  readonly type: 'path';
  readonly path: string;
  readonly packaging?: ModuleArtifactPackagingType;
  readonly integrity?: IModuleArtifactIntegrity;
}

export interface IModuleUrlArtifactSource {
  readonly type: 'url';
  readonly url: string;
  readonly packaging?: ModuleArtifactPackagingType;
  readonly integrity?: IModuleArtifactIntegrity;
}

export interface IModuleRegistryArtifactSource {
  readonly type: 'registry';
  readonly packageName: string;
  readonly version: string;
  readonly registryUrl?: string;
  readonly packaging?: ModuleArtifactPackagingType;
  readonly integrity?: IModuleArtifactIntegrity;
}

export type ModuleArtifactSourceDescriptorType =
  | IModulePathArtifactSource
  | IModuleUrlArtifactSource
  | IModuleRegistryArtifactSource;

export interface IDiscoveredModuleArtifact {
  readonly sourceType: ModuleArtifactSourceType;
  readonly sourceRef: string;
  readonly packaging: ModuleArtifactPackagingType;
  readonly orderingKey: string;
  readonly moduleIdHint?: string;
  readonly moduleVersionHint?: string;
  readonly module?: IPlatformModule;
  readonly integrity?: IModuleArtifactIntegrity;
}

export interface IModuleCandidateArtifact {
  readonly module: IPlatformModule;
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly orderingKey: string;
  readonly sourceType: ModuleArtifactSourceType;
  readonly sourceRef: string;
  readonly packaging: ModuleArtifactPackagingType;
}

export interface IRejectedModuleArtifact {
  readonly moduleId: string;
  readonly sourceType: ModuleArtifactSourceType;
  readonly sourceRef: string;
  readonly phase: 'discover' | 'validate';
  readonly reasonCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export interface IModuleDiscoveryResult {
  readonly candidates: readonly IDiscoveredModuleArtifact[];
  readonly rejected: readonly IRejectedModuleArtifact[];
}

export interface IModuleLoadResult {
  readonly loaded: readonly IModuleCandidateArtifact[];
  readonly rejected: readonly IRejectedModuleArtifact[];
}
