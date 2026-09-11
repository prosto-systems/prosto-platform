/** @alpha Lifecycle state of a TypeORM persistence adapter instance. */
export type TypeOrmPersistenceAdapterStateType =
  'new' | 'collecting' | 'initializing' | 'ready' | 'failed' | 'stopped';
