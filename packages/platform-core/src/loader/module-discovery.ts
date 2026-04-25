import type { RuntimeModuleRefType } from '../runtime/runtime.types.js';
import type {
  IDiscoveredModuleArtifact,
  IModuleDiscoveryResult,
  IRejectedModuleArtifact,
  ModuleArtifactPackagingType,
  ModuleArtifactSourceDescriptorType,
} from './loader.types.js';
import { RuntimeReasonCodes } from '../compatibility/reason-codes.js';
import { createRejected } from './loader.utils.js';

function normalizePackaging(
  sourcePackaging: ModuleArtifactPackagingType | undefined,
  fallback: ModuleArtifactPackagingType,
): ModuleArtifactPackagingType {
  return sourcePackaging ?? fallback;
}

function normalizeSource(
  source: ModuleArtifactSourceDescriptorType,
  moduleIdHint: string,
): { ok: true; artifact: IDiscoveredModuleArtifact } | {
  ok: false;
  rejected: IRejectedModuleArtifact
} {
  if (source.type === 'path') {
    if (!source.path.trim()) {
      return {
        ok: false,
        rejected: createRejected('discover', {
          moduleId: moduleIdHint,
          sourceType: 'path',
          sourceRef: source.path,
          reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
          message: 'Artifact path source descriptor is empty.',
          remediationHint: 'Provide non-empty filesystem path for path source.',
        }),
      };
    }

    return {
      ok: true,
      artifact: {
        sourceType: 'path',
        sourceRef: source.path,
        packaging: normalizePackaging(source.packaging, 'zip'),
        orderingKey: `path:${source.path}`,
        moduleIdHint,
        integrity: source.integrity,
      },
    };
  }

  if (source.type === 'url') {
    if (!source.url.trim()) {
      return {
        ok: false,
        rejected: createRejected('discover', {
          moduleId: moduleIdHint,
          sourceType: 'url',
          sourceRef: source.url,
          reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
          message: 'Artifact URL source descriptor is empty.',
          remediationHint: 'Provide non-empty HTTPS URL for url source.',
        }),
      };
    }

    const isHttps = source.url.startsWith('https://');

    if (!isHttps) {
      return {
        ok: false,
        rejected: createRejected('discover', {
          moduleId: moduleIdHint,
          sourceType: 'url',
          sourceRef: source.url,
          reasonCode: RuntimeReasonCodes.SourceUrlInvalid,
          message: 'Artifact URL must use HTTPS.',
          remediationHint: 'Use HTTPS artifact URL in source descriptor.',
        }),
      };
    }

    return {
      ok: true,
      artifact: {
        sourceType: 'url',
        sourceRef: source.url,
        packaging: normalizePackaging(source.packaging, 'zip'),
        orderingKey: `url:${source.url}`,
        moduleIdHint,
        integrity: source.integrity,
      },
    };
  }

  const registryRef = `${source.packageName}@${source.version}`;

  if (!source.packageName.trim() || !source.version.trim()) {
    return {
      ok: false,
      rejected: createRejected('discover', {
        moduleId: moduleIdHint,
        sourceType: 'registry',
        sourceRef: registryRef,
        reasonCode: RuntimeReasonCodes.SourceDescriptorInvalid,
        message: 'Registry source requires non-empty packageName and version.',
        remediationHint: 'Provide registry package coordinates for registry source.',
      }),
    };
  }

  return {
    ok: true,
    artifact: {
      sourceType: 'registry',
      sourceRef: registryRef,
      packaging: normalizePackaging(source.packaging, 'tgz'),
      orderingKey: `registry:${registryRef}`,
      moduleIdHint,
      moduleVersionHint: source.version,
      integrity: source.integrity,
    },
  };
}

export function discoverModules(moduleRefs: readonly RuntimeModuleRefType[]): IModuleDiscoveryResult {
  const candidates: IDiscoveredModuleArtifact[] = [];
  const rejected: IRejectedModuleArtifact[] = [];

  for (const ref of moduleRefs) {
    if ('module' in ref) {
      const moduleId = ref.module.manifest.id;
      const moduleVersion = ref.module.manifest.version;

      candidates.push({
        module: ref.module,
        moduleIdHint: moduleId,
        moduleVersionHint: moduleVersion,
        sourceType: 'memory',
        sourceRef: `memory:${moduleId}@${moduleVersion}`,
        packaging: 'esm',
        orderingKey: `memory:${moduleId}@${moduleVersion}`,
      });

      continue;
    }

    const moduleIdHint = ref.moduleIdHint?.trim() || 'unknown';
    const normalized = normalizeSource(ref.source, moduleIdHint);

    if (!normalized.ok) {
      rejected.push(normalized.rejected);
      continue;
    }

    candidates.push(normalized.artifact);
  }

  candidates.sort(
    (left, right) => left.orderingKey.localeCompare(right.orderingKey),
  );

  rejected.sort((left, right) => {
    const byModule = left.moduleId.localeCompare(right.moduleId);

    return byModule !== 0
      ? byModule
      : left.sourceRef.localeCompare(right.sourceRef);
  });

  return { candidates, rejected };
}
