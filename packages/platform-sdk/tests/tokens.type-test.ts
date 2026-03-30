import {
  createEventToken,
  createServiceToken,
  type IServiceRegistry,
  type ServiceTokenType,
} from '../src/index.js';

interface IHealthService {
  ping: () => string;
}

type AssertType<TValue extends true> = TValue;
type IsEqualType<TLeft, TRight> = (<TValue>() => TValue extends TLeft ? 1 : 2) extends <
  TValue,
>() => TValue extends TRight ? 1 : 2
  ? true
  : false;

const healthToken = createServiceToken<IHealthService>('health.service');
const healthEventToken = createEventToken<{ status: 'ok' | 'failed' }>('health.updated');

type _ServiceTokenTypeAssertionType = AssertType<IsEqualType<typeof healthToken, ServiceTokenType<IHealthService>>>;

declare const registry: IServiceRegistry;

registry.register(healthToken, {
  ping: () => 'ok',
});

const healthService = registry.resolve(healthToken);

if (healthService) {
  healthService.ping();
}

void healthEventToken;

// @ts-expect-error Intentional type-level guard: invalid service shape for token.
registry.register(healthToken, { ping: (code: number) => String(code) });
