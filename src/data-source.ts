import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Merchant } from './merchants/entities/merchant.entity';
import * as dotenv from 'dotenv';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/orderItem.entity';
import { IdempotencyKey } from './orders/entities/idempotency-key.entity';
import { Payment } from './payments/entities/payment.entity';
import { LedgerEntry } from './ledger_entries/entities/ledger_entry.entity';
import { Refund } from './refunds/entities/refund.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Merchant,
    Product,
    Order,
    OrderItem,
    IdempotencyKey,
    Payment,
    LedgerEntry,
    Refund,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
