import type { z } from 'zod';

export function getFieldErrors(
  error: z.ZodError,
): Record<string, readonly string[]> {
  return error.issues.reduce<Record<string, readonly string[]>>(
    (errors, issue) => {
      const field = String(issue.path[0] ?? 'form');
      const messages = errors[field] ?? [];

      errors[field] = [...messages, issue.message];

      return errors;
    },
    {},
  );
}
