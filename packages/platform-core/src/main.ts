import type {
  IModuleContext,
  IPlatformModule,
  IPlatformModuleManifest,
} from '@prosto/platform-sdk';
import { RuntimeBuilder } from '@/runtime/runtime.builder.js';
import Fastify from 'fastify';

class DemoModule implements IPlatformModule {
  readonly manifest: IPlatformModuleManifest = {
    id: 'demo-module',
    version: '1.0.0',
    sdkVersion: '^0.0.0',
    criticality: 'standard',
    securityClass: 'internal',
    capabilities: ['feature.demo'],
    dependencies: [],
    checksum:
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  };

  register(_ctx: IModuleContext): void {
    console.log('[demo] registered');
  }

  init(_ctx: IModuleContext): void {
    console.log('[demo] initialized');
  }

  start(_ctx: IModuleContext): void {
    console.log('[demo] started');
  }

  stop(_ctx: IModuleContext): void {
    console.log('[demo] stopped');
  }
}

async function main(): Promise<void> {
  const runtime = new RuntimeBuilder().build({
    modules: [{ type: 'memory', module: new DemoModule() }],
    environment: process.env.NODE_ENV || 'development',
  });

  await runtime.start();

  console.log(JSON.stringify(runtime.reports.startup, null, 2));

  const shutdown = async (): Promise<void> => {
    console.log('Shutting down...');
    await runtime.stop();
    console.log(JSON.stringify(runtime.reports.shutdown, null, 2));
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const fastify = Fastify({
    logger: true,
  });

  fastify.get('/', async function handler(_request, _reply) {
    return runtime.reports.startup;
  });

  await fastify.listen({ port: 3001 }).catch((error) => {
    fastify.log.error(error);

    throw new Error(error instanceof Error ? error.message : String(error), {
      cause: error,
    });
  });
}

main().catch(() => {
  process.exit(1);
});
