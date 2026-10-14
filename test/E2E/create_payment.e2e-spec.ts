import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { Server } from 'http';

interface OrderResponse {
  id: string;
}

interface ErrorResponse {
  message: string | string[];
  statusCode: number;
  error?: string;
}

interface PaymentResponse {
  message: string;
  init_point: string;
  sandbox_init_point: string;
  payment: {
    id: string;
    status: string;
    currency: string;
    payment_method: string;
    provider: string;
    total: string;
    order: {
      id: string;
    };
  };
}

describe('Payments - Create payment (e2e)', () => {
  let app: INestApplication;
  let testOrderId: string;

  const idempotencyKey = `e2e-setup-order-${Date.now()}`;

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

    const setupResponse = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', idempotencyKey)
      .send(payloadOrden);

    const body = setupResponse.body as unknown as OrderResponse;
    testOrderId = body.id;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.close();
  });

  it('should return status 400 when payment data is invalid', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/payments')
      .send({});

    const body = response.body as unknown as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.message).toEqual([
      'merchant_id must be a UUID',
      'order_id must be a UUID',
      'user_id must be a UUID',
      'payment_method must be a valid payment method',
      'payment_provider must be a valid provider method',
    ]);
  });

  it('should return status 400 when payment data dont have payment_method and payment_provider', async () => {
    const payloadPago = {
      order_id: testOrderId,
      user_id: '86b6820b-7b29-488d-b1e8-14f2e31f8677',
      merchant_id: '24196094-392b-4662-b402-09f566b24906',
      //   payment_method: "credit_card",
      //   payment_provider: 'mercado_pago'
    };

    const response = await request(app.getHttpServer() as Server)
      .post('/payments')
      .send({ payloadPago });

    const body = response.body as unknown as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body.message).toEqual(
      expect.arrayContaining([
        'payment_method must be a valid payment method',
        'payment_provider must be a valid provider method',
      ]),
    );
  });

  it('should return status 201 when payment create succesfully', async () => {
    const payloadPago = {
      order_id: testOrderId,
      user_id: '86b6820b-7b29-488d-b1e8-14f2e31f8677',
      merchant_id: '24196094-392b-4662-b402-09f566b24906',
      payment_method: 'credit_card',
      provider: 'mercado_pago',
    };

    const response = await request(app.getHttpServer() as Server)
      .post('/payments')
      .send(payloadPago);

    const body2 = response.body as unknown as ErrorResponse;

    const body = response.body as unknown as PaymentResponse;

    if (response.status !== 201) console.log('ERROR DETALLE:', body);

    expect(response.status).toBe(201);
    expect(body2.message).toEqual('payment initialized succesfully');

    expect(body.payment.order.id).toBe(testOrderId);

    expect(body.payment.status).toBe('pending');

    expect(body.init_point).toBeDefined();
    expect(typeof body.init_point).toBe('string');

    expect(body.init_point).toContain('mercadopago.com');

    expect(body.sandbox_init_point).toContain('sandbox.mercadopago.com');
  });
});
