import type {
  HttpApplicationStateType,
  HttpEndpointHandlerType,
  HttpRequestBodyErrorCodeType,
  IHttpApplication,
  IHttpApplicationRuntime,
  IHttpEndpointRegistrarProvider,
  IHttpModuleContext,
  IPlatformModuleContext,
  ServiceRegistryConfiguratorType,
} from '@/index.js';
import {
  HTTP_APPLICATION_STATES,
  HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  HttpRequestBodyError,
} from '@/index.js';

declare const moduleContext: IPlatformModuleContext;
declare const unknownError: unknown;

const endpointHandler: HttpEndpointHandlerType = async (context) => {
  if (context.body.kind === 'json') {
    const json: unknown = context.body.value;
    void json;
  }

  if (context.body.kind === 'text') {
    const text: string = context.body.value;
    void text;
  }

  if (context.body.kind === 'stream') {
    const stream: ReadableStream<Uint8Array> = context.body.stream;
    const mediaType: string = context.body.mediaType;
    void stream;
    void mediaType;
  }

  if (context.body.kind === 'multipart') {
    const parts: AsyncIterable<import('@/index.js').HttpMultipartPartType> =
      context.body.parts;
    void parts;
  }

  return Response.json({ correlationId: context.correlationId });
};

const runtime: IHttpApplicationRuntime = {
  started: true,
  degraded: false,
  stopped: false,
  startedModuleIds: ['module-test'],
  start: async (): Promise<void> => undefined,
  stop: async (): Promise<void> => undefined,
};

const application: IHttpApplication = {
  state: 'created',
  url: undefined,
  start: async (): Promise<void> => undefined,
  stop: async (): Promise<void> => undefined,
};

const state: HttpApplicationStateType = HTTP_APPLICATION_STATES[0];
const http: IHttpModuleContext | undefined = moduleContext.http;
const configureServices: ServiceRegistryConfiguratorType = (services): void => {
  const provider: IHttpEndpointRegistrarProvider = services.resolveRequired(
    HTTP_ENDPOINT_REGISTRAR_PROVIDER_SERVICE_TOKEN,
  );
  void provider;
};

if (unknownError instanceof HttpRequestBodyError) {
  const code: HttpRequestBodyErrorCodeType = unknownError.code;
  void code;
}

void endpointHandler;
void runtime;
void application;
void state;
void http;
void configureServices;
