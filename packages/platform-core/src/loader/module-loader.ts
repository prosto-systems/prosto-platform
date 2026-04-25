import type {
  IDiscoveredModuleArtifact,
  IModuleCandidateArtifact,
  IModuleLoadResult,
  IRejectedModuleArtifact,
} from './loader.types.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RuntimeReasonCodes } from '../compatibility/reason-codes.js';
import { createRejected } from './loader.utils.js';
import { assert } from '../utils/common.utils.js';

function parseChecksum(input: string): {
  algorithm: string;
  value: string
} | null {
  const normalized = input.trim();

  if (!normalized) {
    return null;
  }

  const [algorithm, value] = normalized.split(':');

  if (algorithm && value) {
    return {
      algorithm: algorithm.toLowerCase(),
      value: value.toLowerCase(),
    };
  }

  if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return {
      algorithm: 'sha256',
      value: normalized.toLowerCase(),
    };
  }

  return null;
}

async function verifyPathIntegrity(
  artifact: IDiscoveredModuleArtifact,
): Promise<IRejectedModuleArtifact | null> {
  const checksum = artifact.integrity?.checksum;

  if (!checksum) {
    return createRejected('validate', {
      moduleId: artifact.moduleIdHint ?? 'unknown',
      sourceType: artifact.sourceType,
      sourceRef: artifact.sourceRef,
      reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
      message: 'Missing checksum for path artifact source.',
      remediationHint: 'Provide checksum in source.integrity.checksum for path source.',
    });
  }

  const parsed = parseChecksum(checksum);

  if (!parsed) {
    return createRejected('validate', {
      moduleId: artifact.moduleIdHint ?? 'unknown',
      sourceType: artifact.sourceType,
      sourceRef: artifact.sourceRef,
      reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
      message: 'Unsupported checksum format for path source.',
      remediationHint: 'Use sha256:<hex> or <hex> checksum format.',
    });
  }

  if (parsed.algorithm !== 'sha256') {
    return createRejected('validate', {
      moduleId: artifact.moduleIdHint ?? 'unknown',
      sourceType: artifact.sourceType,
      sourceRef: artifact.sourceRef,
      reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
      message: `Unsupported checksum algorithm "${parsed.algorithm}" for path source.`,
      remediationHint: 'Use sha256 checksum for path source.',
    });
  }

  let payload: Buffer;

  try {
    payload = await readFile(artifact.sourceRef);
  } catch (error) {
    return createRejected('validate', {
      moduleId: artifact.moduleIdHint ?? 'unknown',
      sourceType: artifact.sourceType,
      sourceRef: artifact.sourceRef,
      reasonCode: RuntimeReasonCodes.SourceFetchFailed,
      message: `Unable to read artifact from path source: ${error instanceof Error ? error.message : 'unknown error'}`,
      remediationHint: 'Ensure file exists and runtime has read permissions.',
    });
  }

  const actual = createHash('sha256').update(payload).digest('hex');

  if (actual !== parsed.value) {
    return createRejected('validate', {
      moduleId: artifact.moduleIdHint ?? 'unknown',
      sourceType: artifact.sourceType,
      sourceRef: artifact.sourceRef,
      reasonCode: RuntimeReasonCodes.SourceIntegrityMismatch,
      message: 'Path source checksum mismatch.',
      remediationHint: 'Update checksum metadata or artifact payload to match expected integrity.',
    });
  }

  return null;
}

function normalizeLoadedMemoryArtifact(artifact: IDiscoveredModuleArtifact): IModuleCandidateArtifact {
  const module = artifact.module;

  assert(module, 'Module artifact must have a valid module instance');

  return {
    module,
    moduleId: module.manifest.id,
    moduleVersion: module.manifest.version,
    orderingKey: artifact.orderingKey,
    sourceType: artifact.sourceType,
    sourceRef: artifact.sourceRef,
    packaging: artifact.packaging,
  };
}

export async function loadModuleArtifacts(
  candidates: readonly IDiscoveredModuleArtifact[],
): Promise<IModuleLoadResult> {
  const loaded: IModuleCandidateArtifact[] = [];
  const rejected: IRejectedModuleArtifact[] = [];

  for (const artifact of candidates) {
    if (artifact.sourceType === 'memory') {
      if (!artifact.module) {
        rejected.push(
          createRejected('validate', {
            moduleId: artifact.moduleIdHint ?? 'unknown',
            sourceType: artifact.sourceType,
            sourceRef: artifact.sourceRef,
            reasonCode: RuntimeReasonCodes.SourceEntryResolveFailed,
            message: 'Memory source artifact does not contain module instance.',
            remediationHint: 'Provide module object for memory source.',
          }),
        );
        continue;
      }

      loaded.push(normalizeLoadedMemoryArtifact(artifact));
      continue;
    }

    if (artifact.sourceType === 'path') {
      const pathFailure = await verifyPathIntegrity(artifact);

      if (pathFailure) {
        rejected.push(pathFailure);
        continue;
      }

      // TODO: Implement path extraction and module entry resolution in loader implementation.

      rejected.push(
        createRejected('validate', {
          moduleId: artifact.moduleIdHint ?? 'unknown',
          sourceType: artifact.sourceType,
          sourceRef: artifact.sourceRef,
          reasonCode: RuntimeReasonCodes.SourceEntryResolveFailed,
          message: 'Path source artifact verified but runtime entry resolution is not implemented yet.',
          remediationHint: 'Enable path extraction and module entry resolution in loader implementation.',
        }),
      );
      continue;
    }

    if (artifact.sourceType === 'url') {
      // TODO: Implement HTTPS fetch adapter for URL source.

      rejected.push(
        createRejected('validate', {
          moduleId: artifact.moduleIdHint ?? 'unknown',
          sourceType: artifact.sourceType,
          sourceRef: artifact.sourceRef,
          reasonCode: RuntimeReasonCodes.SourceFetchFailed,
          message: 'URL source adapter is not implemented yet.',
          remediationHint: 'Implement HTTPS fetch adapter for URL source.',
        }),
      );
      continue;
    }

    rejected.push(
      createRejected('validate', {
        moduleId: artifact.moduleIdHint ?? 'unknown',
        sourceType: artifact.sourceType,
        sourceRef: artifact.sourceRef,
        reasonCode: RuntimeReasonCodes.SourceFetchFailed,
        message: 'Registry source adapter is not implemented yet.',
        remediationHint: 'Implement registry resolution adapter for registry source.',
      }),
    );
  }

  loaded.sort(
    (left, right) => left.orderingKey.localeCompare(right.orderingKey),
  );

  rejected.sort((left, right) => {
    const byModule = left.moduleId.localeCompare(right.moduleId);

    return byModule !== 0
      ? byModule
      : left.sourceRef.localeCompare(right.sourceRef);
  });

  return { loaded, rejected };
}
