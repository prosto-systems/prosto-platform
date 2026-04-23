import type { IPlatformModule } from '@prosto/platform-sdk';
import type {
  IBootstrapContext,
  IBootstrapCoordinatorInput,
  IBootstrapCoordinatorLifecycleResult,
  IBootstrapStageOutcome,
} from './bootstrap.types.js';
import type {
  IRuntimeFailureDiagnostic,
} from '../diagnostics/diagnostics.types.js';
import type { IRejectedModuleArtifact } from '../loader/loader.types.js';
import {
  checkModuleCompatibility,
} from '../compatibility/compatibility-checker.js';
import { guardManifest } from '../compatibility/manifest-guard.js';
import { RuntimeReasonCodes } from '../compatibility/reason-codes.js';
import { createDependencyGraph } from '../graph/dependency-graph.js';
import { DependencyCycleError } from '../graph/graph.errors.js';
import { topologicalSort } from '../graph/topological-sort.js';
import { evaluateStartupPolicy } from '../policy/startup-policy-evaluator.js';

export function coordinateBootstrap(
  input: IBootstrapCoordinatorInput,
  lifecycleResult: IBootstrapCoordinatorLifecycleResult,
): Omit<IBootstrapContext, 'startupReport'> {
  const stageOutcomes: IBootstrapStageOutcome[] = [];
  const loadedModules: IPlatformModule[] = [];
  const skippedModuleIds = new Set<string>();
  const failedDiagnostics: IRuntimeFailureDiagnostic[] = [];
  const discoveryFailures: IRejectedModuleArtifact[] = []

  for (const preRejectedArtifact of input.preRejectedArtifacts) {
    skippedModuleIds.add(preRejectedArtifact.moduleId)

    failedDiagnostics.push({
      moduleId: preRejectedArtifact.moduleId,
      phase: preRejectedArtifact.phase,
      errorCode: preRejectedArtifact.reasonCode,
      message: preRejectedArtifact.message,
      remediationHint: preRejectedArtifact.remediationHint,
    })

    if (preRejectedArtifact.phase === 'discover') {
      discoveryFailures.push(preRejectedArtifact)
    }
  }

  stageOutcomes.push({
    stage: 'discover',
    ok: discoveryFailures.length === 0,
    details:
      discoveryFailures.length > 0
        ? `${discoveryFailures.length} modules rejected during discover stage`
        : undefined,
  });

  const validatedModules: IPlatformModule[] = [];

  for (const artifact of input.candidates) {
    const manifestCheck = guardManifest(artifact.moduleId, artifact.module.manifest);

    if (!manifestCheck.ok) {
      if (manifestCheck.error) {
        failedDiagnostics.push(manifestCheck.error);
      }

      skippedModuleIds.add(artifact.moduleId);
      continue;
    }

    if (!artifact.module.manifest.checksum && !artifact.module.manifest.signature) {
      failedDiagnostics.push({
        moduleId: artifact.moduleId,
        phase: 'validate',
        errorCode: RuntimeReasonCodes.IntegrityCheckFailed,
        message: 'Neither checksum nor signature is present in module manifest.',
        remediationHint: 'Provide checksum and/or signature for module artifact integrity evidence.',
      });
      skippedModuleIds.add(artifact.moduleId);
      continue;
    }

    const compatibility = checkModuleCompatibility(artifact.module, input.runtimeVersion);

    if (!compatibility.compatible) {
      if (compatibility.error) {
        failedDiagnostics.push(compatibility.error);
      }

      skippedModuleIds.add(artifact.moduleId);
      continue;
    }

    validatedModules.push(artifact.module);
  }

  const validateFailuresCount = failedDiagnostics.filter((item) => item.phase === 'validate').length;

  stageOutcomes.push({
    stage: 'validate',
    ok: validateFailuresCount === 0,
    details: `${validatedModules.length}/${input.candidates.length} modules validated`,
  });

  const graph = createDependencyGraph(validatedModules);

  let orderedModules: readonly IPlatformModule[] = [];

  try {
    const topological = topologicalSort(graph);

    for (const [moduleId, missing] of topological.missingDependencies) {
      failedDiagnostics.push({
        moduleId,
        phase: 'resolve',
        errorCode: RuntimeReasonCodes.DependencyMissing,
        message: `Missing required dependencies: ${missing.join(', ')}`,
        remediationHint: 'Ensure all required dependencies are discoverable by runtime.',
      });

      const module = graph.get(moduleId)?.module;
      const policy = evaluateStartupPolicy({
        policyMode: input.policyMode,
        moduleId,
        critical: module?.manifest.criticality === 'critical',
      });

      if (policy.action === 'abort') {
        stageOutcomes.push({
          stage: 'resolve',
          ok: false,
          details: policy.reason,
        });

        return {
          policyMode: input.policyMode,
          stageOutcomes,
          loadedModules: [],
          skippedModuleIds: [...skippedModuleIds].sort((left, right) => left.localeCompare(right)),
          failedDiagnostics,
        };
      }

      skippedModuleIds.add(moduleId);
    }

    orderedModules = topological.orderedModules.filter((module) => !skippedModuleIds.has(module.manifest.id));

    stageOutcomes.push({ stage: 'resolve', ok: true });
  } catch (error) {
    if (error instanceof DependencyCycleError) {
      failedDiagnostics.push({
        moduleId: error.moduleIds.join(','),
        phase: 'resolve',
        errorCode: RuntimeReasonCodes.DependencyCycleDetected,
        message: error.message,
        remediationHint: 'Remove dependency cycle between impacted modules.',
      });
    } else {
      failedDiagnostics.push({
        moduleId: 'unknown',
        phase: 'resolve',
        errorCode: RuntimeReasonCodes.DependencyCycleDetected,
        message: error instanceof Error ? error.message : 'Unknown graph resolution error.',
        remediationHint: 'Inspect dependency graph resolver inputs.',
      });
    }

    stageOutcomes.push({ stage: 'resolve', ok: false });

    return {
      policyMode: input.policyMode,
      stageOutcomes,
      loadedModules: [],
      skippedModuleIds: [...skippedModuleIds].sort((left, right) => left.localeCompare(right)),
      failedDiagnostics,
    };
  }

  for (const issue of lifecycleResult.issues) {
    const module = orderedModules.find((item) => item.manifest.id === issue.moduleId);
    const policy = evaluateStartupPolicy({
      policyMode: input.policyMode,
      moduleId: issue.moduleId,
      critical: module?.manifest.criticality === 'critical',
    });

    failedDiagnostics.push({
      moduleId: issue.moduleId,
      phase: 'lifecycle',
      errorCode: issue.errorCode,
      message: issue.message,
      remediationHint: issue.remediationHint,
    });

    if (policy.action === 'abort') {
      stageOutcomes.push({
        stage: 'lifecycle',
        ok: false,
        details: policy.reason,
      });

      return {
        policyMode: input.policyMode,
        stageOutcomes,
        loadedModules: [],
        skippedModuleIds: [...new Set([...skippedModuleIds, issue.moduleId])].sort((left, right) =>
          left.localeCompare(right),
        ),
        failedDiagnostics,
      };
    }

    skippedModuleIds.add(issue.moduleId);
  }

  for (const module of lifecycleResult.startedModules) {
    if (!skippedModuleIds.has(module.manifest.id)) {
      loadedModules.push(module);
    }
  }

  stageOutcomes.push({ stage: 'lifecycle', ok: true });

  return {
    policyMode: input.policyMode,
    stageOutcomes,
    loadedModules,
    skippedModuleIds: [...skippedModuleIds].sort((left, right) => left.localeCompare(right)),
    failedDiagnostics,
  };
}
