import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Server } from 'http';
import { AppModule } from 'src/app.module';
import { OrderStatus, PaymentStatus } from 'src/common/enums/payment.enum';
import { LedgerEntryType } from 'src/common/enums/ledgerEntries.enum';
import { LedgerEntry } from 'src/ledger_entries/entities/ledger_entry.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { Payment as MPPayment } from 'mercadopago';
import request from 'supertest';
import { Repository } from 'typeorm';
import {
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

type MercadoPagoPaymentResponse = Awaited<ReturnType<MPPayment['get']>>;

describe('Payments - Webhook (e2e)', () => {
  let app: INestApplication;
  let paymentRepository: Repository<Payment>;
  let orderRepository: Repository<Order>;
  let ledgerRepository: Repository<LedgerEntry>;

  const userId = '86b6820b-7b29-488d-b1e8-14f2e31f8677';
  const merchantId = '24196094-392b-4662-b402-09f566b24906';
  const productId = '123e82d4-dabf-4159-8d22-a39a2200d8c0';

  let testPayment: Payment;
  let testOrder: Order;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    paymentRepository = app.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    orderRepository = app.get<Repository<Order>>(getRepositoryToken(Order));
    ledgerRepository = app.get<Repository<LedgerEntry>>(
      getRepositoryToken(LedgerEntry),
    );

    await app.init();
  });

  beforeEach(async () => {
    // Cada test recibe una orden nueva y un pago nuevo.
    const orderResponse = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', `e2e-webhook-${Date.now()}-${Math.random()}`)
      .send({
        user_id: userId,
        merchant_id: merchantId,
        items: [
          {
            product_id: productId,
            quantity: 2,
          },
        ],
      });

    expect(orderResponse.status).toBe(201);

    const orderBody = orderResponse.body as { id: string };

    testOrder = await orderRepository.findOneOrFail({
      where: { id: orderBody.id },
      relations: { merchant: true },
    });

    testPayment = await paymentRepository.save(
      paymentRepository.create({
        currency: testOrder.currency || 'USD',
        total: testOrder.total,
        payment_method: 'credit_card' as Payment['payment_method'],
        provider: 'mercado_pago' as Payment['provider'],
        provider_reference_id: `PREFERENCE-${testOrder.id}`,
        status: PaymentStatus.PENDING,
        merchant: { id: merchantId },
        user: { id: userId },
        order: { id: testOrder.id },
      }),
    );
  });

  afterEach(() => {
    // También se ejecuta si una expectativa falla.
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should acknowledge safely when the payload lacks an id and topic', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/payments/webhook')
      .send({});

    expect(response.status).toBe(201);
    const body = response.body as { message: string };
    expect(body.message).toBe('Webhook notification acknowledged safely');

    const unchangedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
    });

    expect(unchangedPayment.status).toBe(PaymentStatus.PENDING);
  });

  it('should mark the payment FAILED and order CANCELLED when Mercado Pago rejects the payment', async () => {
    const mpPaymentId = `MP-REJECTED-${testOrder.id}`;

    jest.spyOn(MPPayment.prototype, 'get').mockResolvedValue({
      id: mpPaymentId,
      status: 'rejected',
      external_reference: testOrder.id,
    } as unknown as MercadoPagoPaymentResponse);

    const response = await request(app.getHttpServer() as Server)
      .post('/payments/webhook')
      .send({
        action: 'payment.updated',
        type: 'payment',
        data: { id: mpPaymentId },
      });

    expect(response.status).toBe(201);
    const body = response.body as { received: boolean };
    expect(body.received).toBe(true);

    const updatedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
      relations: { order: true },
    });

    expect(updatedPayment.status).toBe(PaymentStatus.FAILED);
    expect(updatedPayment.order.status).toBe(OrderStatus.CANCELLED);
    expect(updatedPayment.provider_reference_id).toBe(mpPaymentId);

    const creditEntries = await ledgerRepository.find({
      where: {
        payment: { id: testPayment.id },
        type: LedgerEntryType.CREDIT,
      },
    });

    expect(creditEntries).toHaveLength(0);
  });

  it('should capture the payment, complete the order and create one CREDIT ledger entry', async () => {
    const mpPaymentId = `MP-APPROVED-${testOrder.id}`;

    jest.spyOn(MPPayment.prototype, 'get').mockResolvedValue({
      id: mpPaymentId,
      status: 'approved',
      external_reference: testOrder.id,
    } as unknown as MercadoPagoPaymentResponse);

    const response = await request(app.getHttpServer() as Server)
      .post('/payments/webhook')
      .send({
        action: 'payment.updated',
        type: 'payment',
        data: { id: mpPaymentId },
      });

    expect(response.status).toBe(201);
    const body = response.body as { received: boolean };
    expect(body.received).toBe(true);

    const updatedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
      relations: { order: true },
    });

    expect(updatedPayment.status).toBe(PaymentStatus.CAPTURED);
    expect(updatedPayment.order.status).toBe(OrderStatus.COMPLETED);
    expect(updatedPayment.provider_reference_id).toBe(mpPaymentId);

    const creditEntries = await ledgerRepository.find({
      where: {
        payment: { id: testPayment.id },
        type: LedgerEntryType.CREDIT,
      },
    });

    expect(creditEntries).toHaveLength(1);
    expect(Number(creditEntries[0].amount)).toBe(Number(testPayment.total));
  });

  it('should not create duplicate CREDIT entries when the same approved webhook is received twice', async () => {
    const mpPaymentId = `MP-DUPLICATE-${testOrder.id}`;

    jest.spyOn(MPPayment.prototype, 'get').mockResolvedValue({
      id: mpPaymentId,
      status: 'approved',
      external_reference: testOrder.id,
    } as unknown as MercadoPagoPaymentResponse);

    const payload = {
      action: 'payment.updated',
      type: 'payment',
      data: { id: mpPaymentId },
    };

    const firstResponse = await request(app.getHttpServer() as Server)
      .post('/payments/webhook')
      .send(payload);

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app.getHttpServer() as Server)
      .post('/payments/webhook')
      .send(payload);

    expect(secondResponse.status).toBe(201);
    const secondBody = secondResponse.body as { received: boolean };
    expect(secondBody.received).toBe(true);

    const updatedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
      relations: { order: true },
    });

    expect(updatedPayment.status).toBe(PaymentStatus.CAPTURED);
    expect(updatedPayment.order.status).toBe(OrderStatus.COMPLETED);
    expect(updatedPayment.provider_reference_id).toBe(mpPaymentId);

    const creditEntries = await ledgerRepository.find({
      where: {
        payment: { id: testPayment.id },
        type: LedgerEntryType.CREDIT,
      },
    });

    expect(creditEntries).toHaveLength(1);
    expect(Number(creditEntries[0].amount)).toBe(Number(testPayment.total));
  });
});
