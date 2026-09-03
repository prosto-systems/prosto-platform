import { readFileSync, existsSync } from 'node:fs';

/**
 * @internal
 * Loads and parses a JSON object from the filesystem.
 *
 * @param filePath - Path to the JSON file.
 * @param optional - Return an empty object when the file is absent.
 * @returns The parsed object, or an empty object for an absent optional file.
 * @throws When a required file is absent or its content is invalid JSON.
 */
export function loadJsonFileSync<T extends object = Record<string, unknown>>(
  filePath: string,
  optional = false,
): T {
  if (!existsSync(filePath)) {
    if (optional) return {} as T;

    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');

  if (!content.trim()) return {} as T;

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse file "${filePath}": ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
}
