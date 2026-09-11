/** @alpha Raised when a mandatory adapter lifecycle phase fails. */
export class RuntimeAdapterLifecycleError extends Error {
  constructor(
    public readonly adapterId: string,
    public readonly stage: 'initialize' | 'start' | 'stop',
  ) {
    super(`Required runtime adapter "${adapterId}" failed during ${stage}.`);
    this.name = 'RuntimeAdapterLifecycleError';
  }
}
