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
