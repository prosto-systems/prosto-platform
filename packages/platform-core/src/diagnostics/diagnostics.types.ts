import type { StartupPolicyType } from '@prosto/platform-sdk';
import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';

export type RuntimeStageType =
  | 'discover'
  | 'validate'
  | 'resolve'
  | 'lifecycle'
  | 'shutdown';

export interface IRuntimeFailureDiagnostic {
  readonly moduleId: string;
  readonly phase: RuntimeStageType;
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export interface IRuntimeSkippedModuleDiagnostic {
  readonly moduleId: string;
  readonly reason: IRuntimeFailureDiagnostic;
}

export interface IRuntimeLoadedModuleDiagnostic {
  readonly moduleId: string;
  readonly version: string;
}

export enum RuntimeStartupStatus {
  Success = 'success',
  Degraded = 'degraded',
  Failed = 'failed',
}

export type RuntimeStartupStatusType = `${RuntimeStartupStatus}`;

export interface IRuntimeStartupReport {
  readonly type: 'startup';
  readonly status: RuntimeStartupStatusType;
  readonly policyMode: StartupPolicyType;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly degraded: boolean;
  readonly loadedModules: readonly IRuntimeLoadedModuleDiagnostic[];
  readonly skippedModules: readonly IRuntimeSkippedModuleDiagnostic[];
  readonly failedModules: readonly IRuntimeFailureDiagnostic[];
}

export interface IRuntimeShutdownIssue {
  readonly moduleId: string;
  readonly phase: 'shutdown';
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

export interface IRuntimeShutdownReport {
  readonly type: 'shutdown';
  readonly correlationId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly stopOrder: readonly string[];
  readonly issues: readonly IRuntimeShutdownIssue[];
}

export interface IRuntimeOperationalReports {
  readonly startup: IRuntimeStartupReport;
  readonly shutdown?: IRuntimeShutdownReport;
}

export interface IStartupReportInput {
  readonly policyMode: StartupPolicyType;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly loadedModules: readonly IRuntimeLoadedModuleDiagnostic[];
  readonly skippedModules: readonly IRuntimeSkippedModuleDiagnostic[];
  readonly failedModules: readonly IRuntimeFailureDiagnostic[];
}

export interface IShutdownReportInput {
  readonly correlationId: string;
  readonly startedAt: string;
  readonly stopOrder: readonly string[];
  readonly issues: IRuntimeShutdownReport['issues'];
}
