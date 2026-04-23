import type {
  IModuleContext,
  IPlatformModule,
  IPlatformModuleManifest,
  ModuleLifecycleStageType,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';

export type LifecycleStageType = Exclude<ModuleLifecycleStageType, 'stop'>;

export interface ILifecycleExecutionIssue {
  readonly moduleId: string;
  readonly phase: 'lifecycle';
  readonly lifecycleStage: LifecycleStageType;
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export interface ILifecycleStartupResult {
  readonly startedModules: readonly IPlatformModule[];
  readonly issues: readonly ILifecycleExecutionIssue[];
}

export interface IShutdownIssue {
  readonly moduleId: string;
  readonly phase: 'shutdown';
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export interface ILifecycleShutdownResult {
  readonly stopOrder: readonly IPlatformModuleManifest['id'][];
  readonly issues: readonly IShutdownIssue[];
}

export interface ICreateModuleContextOptions {
  readonly moduleId: string;
  readonly startupPolicy: StartupPolicyType;
  readonly sdkVersion: string;
}

export interface ILifecycleExecutionContextFactory {
  create(options: ICreateModuleContextOptions): IModuleContext;
}
