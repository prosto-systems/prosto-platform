import {
  createTypeOrmPersistenceDescriptor,
  TYPEORM_DATA_SOURCE_SERVICE_TOKEN,
} from '@prosto/platform-adapter-typeorm';
import type {
  IPlatformModule,
  IPlatformModuleContext,
} from '@prosto/platform-sdk';
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

export class OrdersModule implements IPlatformModule {
  init(context: IPlatformModuleContext): void {
    context.persistence?.descriptors?.register(context.moduleId, {
      owner: 'module',
      ownerId: context.moduleId,
      payload: createTypeOrmPersistenceDescriptor({
        entities: [OrdersOrder],
        migrations: [module_order_create_order1710000001001],
      }),
    });
  }

  async start(context: IPlatformModuleContext): Promise<void> {
    const dataSource = context.services.resolveRequired(
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
