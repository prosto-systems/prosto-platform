import type { IPlatformModule, StartupPolicyType } from '@prosto/platform-sdk';
import type {
  ILifecycleExecutionContextFactory,
  ILifecycleExecutionIssue,
  ILifecycleShutdownResult,
  ILifecycleStartupResult,
  IShutdownIssue,
  LifecycleStageType,
} from './lifecycle.types.js';
import {
  LIFECYCLE_PHASE_TO_REASON_CODE,
  RuntimeReasonCodes,
} from '../compatibility/reason-codes.js';
import { ShutdownTimeoutError } from './lifecycle.errors.js';

function toIssue(
  moduleId: string,
  stage: LifecycleStageType,
  error: unknown,
): ILifecycleExecutionIssue {
  return {
    moduleId,
    phase: 'lifecycle',
    lifecycleStage: stage,
    errorCode: LIFECYCLE_PHASE_TO_REASON_CODE[stage],
    message: error instanceof Error ? error.message : `Unknown ${stage} error.`,
    remediationHint: `Inspect module "${moduleId}" ${stage} implementation and runtime dependencies.`,
  };
}

async function executeStage(
  module: IPlatformModule,
  stage: LifecycleStageType,
  contextFactory: ILifecycleExecutionContextFactory,
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
): Promise<void> {
  const context = contextFactory.create({
    moduleId: module.manifest.id,
    startupPolicy,
    sdkVersion,
  });

  await module[stage](context);
}

async function runModuleStartup(
  module: IPlatformModule,
  contextFactory: ILifecycleExecutionContextFactory,
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
): Promise<LifecycleStageType | null> {
  const stages: LifecycleStageType[] = ['register', 'init', 'start'];

  for (const stage of stages) {
    try {
      await executeStage(
        module,
        stage,
        contextFactory,
        startupPolicy,
        sdkVersion,
      );
    } catch {
      return stage;
    }
  }

  return null;
}

export async function runStartupLifecycle(
  modules: readonly IPlatformModule[],
  contextFactory: ILifecycleExecutionContextFactory,
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
): Promise<ILifecycleStartupResult> {
  const startedModules: IPlatformModule[] = [];
  const issues: ILifecycleExecutionIssue[] = [];

  for (const module of modules) {
    const failedStage = await runModuleStartup(
      module,
      contextFactory,
      startupPolicy,
      sdkVersion,
    );

    if (failedStage) {
      issues.push(
        toIssue(
          module.manifest.id,
          failedStage,
          new Error(`Module failed during ${failedStage}.`),
        ),
      );
      continue;
    }

    startedModules.push(module);
  }

  return {
    startedModules,
    issues,
  };
}

async function shutdownWithTimeout(
  promise: Promise<void>,
  timeoutMs: number,
  moduleId: string,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      promise,
      new Promise<void>((_, reject) => {
        timer = setTimeout(() => reject(new ShutdownTimeoutError(moduleId, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function runShutdownLifecycle(
  startedModules: readonly IPlatformModule[],
  contextFactory: ILifecycleExecutionContextFactory,
  startupPolicy: StartupPolicyType,
  sdkVersion: string,
  timeoutMs: number,
): Promise<ILifecycleShutdownResult> {
  const stopModules = [...startedModules].reverse();
  const issues: IShutdownIssue[] = [];

  for (const module of stopModules) {
    const moduleId = module.manifest.id;
    const context = contextFactory.create({
      moduleId,
      startupPolicy,
      sdkVersion,
    });

    try {
      await shutdownWithTimeout(
        Promise.resolve(module.stop(context)),
        timeoutMs,
        moduleId,
      );
    } catch (error) {
      issues.push({
        moduleId,
        phase: 'shutdown',
        errorCode: RuntimeReasonCodes.ShutdownTimeout,
        message: error instanceof Error ? error.message : 'Unknown shutdown error.',
        remediationHint: `Ensure module "${moduleId}" stop() resolves before timeout.`,
      });
    }
  }

  return {
    issues,
    stopOrder: stopModules.map((module) => module.manifest.id),
  };
}
