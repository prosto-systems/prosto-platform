import type {
  IHttpApplicationRuntime,
  IPlatformModuleLogger,
} from '@prosto/platform-sdk';

export function isHttpApplicationRuntime(
  value: unknown,
): value is IHttpApplicationRuntime {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.started === 'boolean' &&
    typeof candidate.degraded === 'boolean' &&
    typeof candidate.stopped === 'boolean' &&
    Array.isArray(candidate.startedModuleIds) &&
    candidate.startedModuleIds.every(
      (moduleId) => typeof moduleId === 'string',
    ) &&
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function'
  );
}

export function isPlatformModuleLogger(
  value: unknown,
): value is IPlatformModuleLogger | undefined {
  if (value === undefined) {
    return true;
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.debug === 'function' &&
    typeof candidate.info === 'function' &&
    typeof candidate.warn === 'function' &&
    typeof candidate.error === 'function'
  );
}

export function resolvesWithin(
  promise: Promise<void>,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);

    promise.then(
      () => {
        clearTimeout(timer);
        resolve(true);
      },
      (cause: unknown) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });
}

export function isPayloadTooLargeError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
      error.code === 'FST_REQ_FILE_TOO_LARGE' ||
      error.code === 'FST_PARTS_LIMIT' ||
      error.code === 'FST_FILES_LIMIT' ||
      error.code === 'FST_FIELDS_LIMIT')
  );
}

export function isUnsupportedMediaTypeError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE'
  );
}
