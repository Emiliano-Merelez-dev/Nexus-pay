import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Server } from 'http';
import request from 'supertest';

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
  error?: string;
}

interface OrderResponse {
  id: string;
  status: string;
  items: unknown[];
}

describe('Orders - create and idempotencia (e2e)', () => {
  let app: INestApplication;

  let testOrderId: string;
  const idempotencyKey = `e2e-test-orde-${Date.now()}`;

  const payloadOrden = {
    user_id: '86b6820b-7b29-488d-b1e8-14f2e31f8677',
    merchant_id: '24196094-392b-4662-b402-09f566b24906',
    items: [
      {
        product_id: '123e82d4-dabf-4159-8d22-a39a2200d8c0',
        quantity: 2,
      },
    ],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.close();
  });

  it('should cant create a order, status 400', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', idempotencyKey)
      .send({});

    const body = response.body as unknown as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.message).toBe(
      'Valid Merchant ID is required in the body for idempotent requests',
    );
  });

  it('should cant create a order, status 400 (Fail for DTO)', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', idempotencyKey)
      .send({
        merchant_id: '24196094-392b-4662-b402-09f566b24906',
      });

    const body = response.body as unknown as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.message).toEqual([
      'user_id must be a UUID',
      'items must contain at least 1 elements',
      'items must be an array',
    ]);
  });

  it('should create a order, status 201', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', idempotencyKey)
      .send(payloadOrden);

    const body = response.body as unknown as OrderResponse;

    expect(response.status).toBe(201);
    expect(body.status).toBe('pending');
    expect(response.body).toHaveProperty('id');
    testOrderId = body.id;
  });

  it('should return the exact same order to idempotencyKey, status 201', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', idempotencyKey)
      .send(payloadOrden);

    const body = response.body as unknown as OrderResponse;

    expect(response.status).toBe(201);
    expect(body.id).toBe(testOrderId);
  });
});
