/** @internal Formats a host-only opaque session cookie with secure defaults. */
export class SessionCookieCodec {
  constructor(
    private readonly _name: string,
    private readonly _lifetimeSeconds: number,
    private readonly _secure: boolean,
  ) {}

  create(value: string): string {
    return this._format(value, this._lifetimeSeconds);
  }

  clear(): string {
    return this._format('', 0);
  }

  private _format(value: string, maxAge: number): string {
    return [
      `${this._name}=${encodeURIComponent(value)}`,
      'HttpOnly',
      'Path=/',
      'SameSite=Strict',
      `Max-Age=${maxAge.toString()}`,
      ...(this._secure ? ['Secure'] : []),
    ].join('; ');
  }
}
