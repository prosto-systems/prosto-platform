/**
 * @alpha
 * HTTP methods supported by platform endpoint declarations.
 */
export const HTTP_METHODS = [
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
] as const;

/** @alpha A method supported by a platform HTTP endpoint. */
export type HttpMethodType = (typeof HTTP_METHODS)[number];
