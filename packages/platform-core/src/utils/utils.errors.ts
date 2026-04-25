/**
 * Represents an error thrown when an assertion fails.
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}
