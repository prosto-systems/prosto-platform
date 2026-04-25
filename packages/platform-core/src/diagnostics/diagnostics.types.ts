import type { StartupPolicyType } from '@prosto/platform-sdk';
import type { RuntimeReasonCodeType } from '../compatibility/reason-codes.js';

/**
 * @alpha
 * Enum representing the different stages of the runtime startup process.
 */
export type RuntimeStageType =
  | 'discover'
  | 'validate'
  | 'resolve'
  | 'lifecycle'
  | 'shutdown';

/**
 * @alpha
 * Interface representing diagnostic information for a runtime failure.
 */
export interface IRuntimeFailureDiagnostic {
  readonly moduleId: string;
  readonly phase: RuntimeStageType;
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

/**
 * @alpha
 * Interface representing diagnostic information for a skipped module during runtime startup.
 */
export interface IRuntimeSkippedModuleDiagnostic {
  readonly moduleId: string;
  readonly reason: IRuntimeFailureDiagnostic;
}

/**
 * @alpha
 * Interface representing diagnostic information for a loaded module during runtime startup.
 */
export interface IRuntimeLoadedModuleDiagnostic {
  readonly moduleId: string;
  readonly version: string;
}

/**
 * @alpha
 * Enum representing the different statuses of the runtime startup process.
 */
export enum RuntimeStartupStatus {
  Success = 'success',
  Degraded = 'degraded',
  Failed = 'failed',
}

/**
 * @alpha
 * Type representing the string representation of the runtime startup status.
 */
export type RuntimeStartupStatusType = `${RuntimeStartupStatus}`;

/**
 * @alpha
 * Interface representing diagnostic information for the runtime startup process.
 */
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

/**
 * @alpha
 * Interface representing diagnostic information for a runtime shutdown issue.
 */
export interface IRuntimeShutdownIssue {
  readonly moduleId: string;
  readonly phase: 'shutdown';
  readonly errorCode: RuntimeReasonCodeType;
  readonly message: string;
  readonly remediationHint: string;
}

/**
 * @alpha
 * Interface representing diagnostic information for the runtime shutdown process.
 */
export interface IRuntimeShutdownReport {
  readonly type: 'shutdown';
  readonly correlationId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly stopOrder: readonly string[];
  readonly issues: readonly IRuntimeShutdownIssue[];
}

/**
 * @alpha
 * Interface representing diagnostic information for the runtime operational reports.
 */
export interface IRuntimeOperationalReports {
  readonly startup: IRuntimeStartupReport;
  readonly shutdown?: IRuntimeShutdownReport;
}

/**
 * @alpha
 * Interface representing input for generating a runtime startup diagnostic report.
 */
export interface IStartupReportInput {
  readonly policyMode: StartupPolicyType;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly loadedModules: readonly IRuntimeLoadedModuleDiagnostic[];
  readonly skippedModules: readonly IRuntimeSkippedModuleDiagnostic[];
  readonly failedModules: readonly IRuntimeFailureDiagnostic[];
}

/**
 * @alpha
 * Interface representing input for generating a runtime shutdown diagnostic report.
 */
export interface IShutdownReportInput {
  readonly correlationId: string;
  readonly startedAt: string;
  readonly stopOrder: readonly string[];
  readonly issues: IRuntimeShutdownReport['issues'];
}
