import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

export const E2E_IDS = {
  userId: '86b6820b-7b29-488d-b1e8-14f2e31f8677',
  merchantId: '24196094-392b-4662-b402-09f566b24906',
  productId: '123e82d4-dabf-4159-8d22-a39a2200d8c0',
};

export async function seedE2EData(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);

  await dataSource.query(
    `INSERT INTO "users" ("id", "email", "name")
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [E2E_IDS.userId, 'e2e-customer@nexuspay.test', 'E2E Test Customer'],
  );

  await dataSource.query(
    `INSERT INTO "merchants" ("id", "user_id", "business_name")
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [E2E_IDS.merchantId, E2E_IDS.userId, 'E2E Test Merchant'],
  );

  await dataSource.query(
    `INSERT INTO "products" ("id", "merchant_id", "title", "price")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [E2E_IDS.productId, E2E_IDS.merchantId, 'E2E Test Product', 50.0],
  );
}
