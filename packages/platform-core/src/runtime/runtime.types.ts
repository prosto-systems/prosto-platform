import type {
  IPlatformModule,
  IPlatformRuntimeVersionContext,
  StartupPolicyType,
} from '@prosto/platform-sdk';
import type { IRuntimeOperationalReports } from '../diagnostics/diagnostics.types.js';

export interface IRuntimeModuleRef {
  readonly module: IPlatformModule;
}

export interface IRuntimeOptions {
  readonly startupPolicy: StartupPolicyType;
  readonly runtimeVersion: IPlatformRuntimeVersionContext;
  readonly modules: readonly IRuntimeModuleRef[];
  readonly shutdownTimeoutMs?: number;
  readonly correlationId?: string;
}

export interface IPlatformRuntime {
  readonly reports: IRuntimeOperationalReports;
  readonly startedModuleIds: readonly string[];
  readonly degraded: boolean;
  stop(): Promise<void>;
}
