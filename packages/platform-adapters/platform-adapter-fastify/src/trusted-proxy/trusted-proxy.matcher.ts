import { isIP } from 'node:net';

interface IParsedNetwork {
  readonly family: 4 | 6;
  readonly address: bigint;
  readonly prefixLength: number;
}

/** @internal Validates a single literal proxy address or CIDR range. */
export function isTrustedProxyDefinition(value: string): boolean {
  return parseNetwork(value) !== undefined;
}

/** @internal Creates Fastify's address-only proxy trust predicate. */
export function createTrustedProxyMatcher(
  definitions: readonly string[],
): (address: string) => boolean {
  const networks = definitions.map(parseNetwork);

  if (networks.some((network) => network === undefined)) {
    throw new Error('Trusted proxy definitions must be validated before use.');
  }

  return (address: string): boolean => {
    const candidate = parseAddress(address);

    return (
      candidate !== undefined &&
      networks.some(
        (network): boolean =>
          network !== undefined &&
          network.family === candidate.family &&
          network.address ===
            (candidate.address &
              prefixMask(network.prefixLength, candidate.family)),
      )
    );
  };
}

function parseNetwork(value: string): IParsedNetwork | undefined {
  const slashIndex = value.lastIndexOf('/');
  const address = slashIndex === -1 ? value : value.slice(0, slashIndex);
  const parsedAddress = parseAddress(address);

  if (parsedAddress === undefined) {
    return undefined;
  }

  const prefixText =
    slashIndex === -1 ? undefined : value.slice(slashIndex + 1);
  const maximumPrefix = parsedAddress.family === 4 ? 32 : 128;
  const prefixLength =
    prefixText === undefined
      ? maximumPrefix
      : /^[0-9]{1,3}$/u.test(prefixText)
        ? Number(prefixText)
        : Number.NaN;

  if (
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > maximumPrefix
  ) {
    return undefined;
  }

  return {
    family: parsedAddress.family,
    address:
      parsedAddress.address & prefixMask(prefixLength, parsedAddress.family),
    prefixLength,
  };
}

function parseAddress(
  value: string,
): Omit<IParsedNetwork, 'prefixLength'> | undefined {
  const family = isIP(value);

  if (family === 4) {
    const octets = value.split('.').map(Number);
    const address = octets.reduce(
      (result, octet) => (result << 8n) | BigInt(octet),
      0n,
    );

    return { family: 4, address };
  }

  if (family !== 6) {
    return undefined;
  }

  const parts = expandIpv6(value);

  if (parts === undefined) {
    return undefined;
  }

  return {
    family: 6,
    address: parts.reduce(
      (result, part) => (result << 16n) | BigInt(`0x${part}`),
      0n,
    ),
  };
}

function expandIpv6(value: string): readonly string[] | undefined {
  const [beforeCompression, afterCompression, ...extraParts] =
    value.split('::');

  if (extraParts.length > 0) {
    return undefined;
  }

  const before = splitIpv6Parts(beforeCompression ?? '');
  const after = splitIpv6Parts(afterCompression ?? '');

  if (before === undefined || after === undefined) {
    return undefined;
  }

  if (afterCompression === undefined) {
    return before.length === 8 ? before : undefined;
  }

  const missing = 8 - before.length - after.length;

  return missing < 1
    ? undefined
    : [...before, ...Array(missing).fill('0'), ...after];
}

function splitIpv6Parts(value: string): readonly string[] | undefined {
  if (value === '') {
    return [];
  }

  const parts = value.split(':');
  const lastPart = parts.at(-1);

  if (lastPart !== undefined && isIP(lastPart) === 4) {
    const octets = lastPart.split('.').map(Number);
    const [first, second, third, fourth] = octets;

    if (
      first === undefined ||
      second === undefined ||
      third === undefined ||
      fourth === undefined
    ) {
      return undefined;
    }

    parts.splice(
      -1,
      1,
      ((first << 8) | second).toString(16),
      ((third << 8) | fourth).toString(16),
    );
  }

  return parts.every((part) => /^[0-9A-Fa-f]{1,4}$/u.test(part))
    ? parts
    : undefined;
}

function prefixMask(prefixLength: number, family: 4 | 6): bigint {
  const bits = BigInt(family === 4 ? 32 : 128);
  const prefix = BigInt(prefixLength);

  return prefix === 0n ? 0n : ((1n << prefix) - 1n) << (bits - prefix);
}
