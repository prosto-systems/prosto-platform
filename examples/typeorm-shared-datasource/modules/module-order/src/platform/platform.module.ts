import {
  createTypeOrmPersistenceDescriptor,
  TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
} from '@prosto/platform-adapter-typeorm';
import type {
  IPlatformModule,
  IPlatformModuleContext,
} from '@prosto/platform-sdk/platform';
import {
  Entity,
  type MigrationInterface,
  PrimaryGeneratedColumn,
  type QueryRunner,
  Table,
} from 'typeorm';

import 'reflect-metadata';

// Entities

@Entity('module_order_order')
class OrdersOrder {
  @PrimaryGeneratedColumn()
  id!: number;
}

// Migrations

class module_order_create_order1710000001001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'module_order_order',
        columns: [{ name: 'id', type: 'integer', isPrimary: true }],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('module_order_order');
  }
}

/**
 * @alpha
 * Example discovered module that contributes TypeORM metadata during `init()`
 * and consumes the ready shared data source during `start()`.
 */
export class OrdersModule implements IPlatformModule {
  init({
    moduleId,
    services,
    capabilities: { persistence, http },
  }: IPlatformModuleContext): void {
    if (!http) {
      throw new Error('The orders module requires an HTTP runtime adapter.');
    }

    if (!persistence?.descriptors) {
      throw new Error('The orders module requires persistence descriptors.');
    }

    persistence.descriptors.register({
      owner: 'module',
      ownerId: moduleId,
      payload: createTypeOrmPersistenceDescriptor({
        entities: [OrdersOrder],
        migrations: [module_order_create_order1710000001001],
      }),
    });

    http.endpoints.register({
      method: 'GET',
      path: '/api/orders',
      handler: async (): Promise<Response> => {
        const dataSource = services.resolveRequired(
          TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
        );
        const orders = await dataSource.getRepository(OrdersOrder).find();

        return Response.json(orders);
      },
    });
  }

  async start({ services }: IPlatformModuleContext): Promise<void> {
    const dataSource = services.resolveRequired(
      TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
    );

    console.log(
      `[orders module] DataSource is ready: ${dataSource.isInitialized}`,
    );

    const ordersRepository = dataSource.getRepository(OrdersOrder);
    const allOrders = await ordersRepository.find();

    console.log(
      `[orders module] All orders: ${JSON.stringify(allOrders, null, 2)}`,
    );
  }

  stop(_context: IPlatformModuleContext): void {
    return;
  }
}
