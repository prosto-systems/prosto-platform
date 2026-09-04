export const MEBIBYTE = 1024 * 1024;
export const NODE_TIMER_MAXIMUM_MS = 2_147_483_647;
export const DEFAULT_MULTIPART_LIMITS = {
  fileSizeBytes: 10 * MEBIBYTE,
  files: 10,
  fields: 100,
  parts: 110,
  fieldSizeBytes: 64 * 1024,
  fieldNameSizeBytes: 100,
  headerPairs: 200,
  totalSizeBytes: 110 * MEBIBYTE,
} as const;
