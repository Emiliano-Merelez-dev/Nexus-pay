import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Server } from 'http';
import request from 'supertest';
import { Repository } from 'typeorm';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';

import { AppModule } from 'src/app.module';
import { OrderStatus, PaymentStatus } from 'src/common/enums/payment.enum';
import { RefundStatus } from 'src/common/enums/refund-status.enum';
import { LedgerEntryType } from 'src/common/enums/ledgerEntries.enum';

import { LedgerEntry } from 'src/ledger_entries/entities/ledger_entry.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { Refund } from 'src/refunds/entities/refund.entity';

describe('Refunds (e2e)', () => {
  let app: INestApplication;

  let refundRepository: Repository<Refund>;
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
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    refundRepository = app.get<Repository<Refund>>(getRepositoryToken(Refund));

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
    const orderResponse = await request(app.getHttpServer() as Server)
      .post('/orders')
      .set('idempotency-key', `e2e-refund-${Date.now()}-${Math.random()}`)
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

  afterAll(async () => {
    await app.close();
  });

  async function markPaymentAsCaptured(): Promise<void> {
    testPayment.status = PaymentStatus.CAPTURED;
    await paymentRepository.save(testPayment);

    testOrder.status = OrderStatus.COMPLETED;
    await orderRepository.save(testOrder);
  }

  it('should reject a refund request with invalid DTO fields', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: 'not-a-uuid',
        amount: 0,
        unexpected_field: 'invalid',
      });

    expect(response.status).toBe(400);
    const body = response.body as { message: string };

    expect(body.message).toEqual(
      expect.arrayContaining([
        'payment_id must be a UUID',
        'amount must not be less than 0.01',
        'property unexpected_field should not exist',
      ]),
    );
  });

  it('should reject a refund when the payment does not exist', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        amount: 10,
      });

    expect(response.status).toBe(404);
  });

  it('should reject a refund when the payment has not been captured', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: 10,
      });

    expect(response.status).toBe(400);

    const refunds = await refundRepository.find({
      where: { payment: { id: testPayment.id } },
    });

    expect(refunds).toHaveLength(0);
  });

  it('should reject a refund amount greater than the remaining refundable amount', async () => {
    await markPaymentAsCaptured();

    const response = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: Number(testPayment.total) + 1,
      });

    expect(response.status).toBe(400);

    const refunds = await refundRepository.find({
      where: { payment: { id: testPayment.id } },
    });

    expect(refunds).toHaveLength(0);
  });

  it('should create a refund with PENDING status', async () => {
    await markPaymentAsCaptured();

    const response = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: 10,
        reason: 'Customer requested a refund',
      });

    const body = response.body as {
      id: string;
      status: string;
      amount: string | number;
      reason: string;
    };

    expect(response.status).toBe(201);
    // const body = response.body as { id: string; status: RefundStatus };
    expect(body.id).toBeDefined();
    expect(body.status).toBe(RefundStatus.PENDING);
    expect(Number(body.amount)).toBe(10);
    expect(body.reason).toBe('Customer requested a refund');

    const savedRefund = await refundRepository.findOneOrFail({
      where: { id: body.id },
    });

    expect(savedRefund.status).toBe(RefundStatus.PENDING);
  });

  it('should complete a partial refund and create one DEBIT ledger entry', async () => {
    await markPaymentAsCaptured();

    const createResponse = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: 10,
        reason: 'Partial refund',
      });

    expect(createResponse.status).toBe(201);
    const body = createResponse.body as { id: string };

    const refundId = body.id;

    const completeResponse = await request(app.getHttpServer() as Server).post(
      `/refunds/${refundId}/complete`,
    );

    const completedBody = completeResponse.body as { status: string };
    expect(completeResponse.status).toBe(201);
    expect(completedBody.status).toBe(RefundStatus.COMPLETED);

    const updatedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
      relations: { order: true },
    });

    expect(updatedPayment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(updatedPayment.order.status).toBe(OrderStatus.COMPLETED);

    const debitEntries = await ledgerRepository.find({
      where: {
        refund: { id: refundId },
        type: LedgerEntryType.DEBIT,
      },
    });

    expect(debitEntries).toHaveLength(1);
    expect(Number(debitEntries[0].amount)).toBe(10);
  });

  it('should fully refund a payment and cancel its order', async () => {
    await markPaymentAsCaptured();

    const refundAmount = Number(testPayment.total);

    const createResponse = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: refundAmount,
        reason: 'Full refund',
      });

    expect(createResponse.status).toBe(201);

    const body = createResponse.body as { id: string };

    const refundId = body.id;

    const completeResponse = await request(app.getHttpServer() as Server).post(
      `/refunds/${refundId}/complete`,
    );

    const completedBody = completeResponse.body as { status: string };

    expect(completeResponse.status).toBe(201);
    expect(completedBody.status).toBe(RefundStatus.COMPLETED);

    const updatedPayment = await paymentRepository.findOneOrFail({
      where: { id: testPayment.id },
      relations: { order: true },
    });

    expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);
    expect(updatedPayment.order.status).toBe(OrderStatus.CANCELLED);

    const debitEntries = await ledgerRepository.find({
      where: {
        refund: { id: refundId },
        type: LedgerEntryType.DEBIT,
      },
    });

    expect(debitEntries).toHaveLength(1);
    expect(Number(debitEntries[0].amount)).toBe(refundAmount);
  });

  it('should not create duplicate DEBIT entries when a refund is completed twice', async () => {
    await markPaymentAsCaptured();

    const createResponse = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: 10,
        reason: 'Idempotency test',
      });

    expect(createResponse.status).toBe(201);

    const body = createResponse.body as { id: string };

    const refundId = body.id;

    const firstResponse = await request(app.getHttpServer() as Server).post(
      `/refunds/${refundId}/complete`,
    );

    const firstBody = firstResponse.body as { status: string };
    expect(firstResponse.status).toBe(201);
    expect(firstBody.status).toBe(RefundStatus.COMPLETED);

    const secondResponse = await request(app.getHttpServer() as Server).post(
      `/refunds/${refundId}/complete`,
    );

    const secondBody = secondResponse.body as { status: string };

    expect(secondResponse.status).toBe(201);
    expect(secondBody.status).toBe(RefundStatus.COMPLETED);

    const debitEntries = await ledgerRepository.find({
      where: {
        refund: { id: refundId },
        type: LedgerEntryType.DEBIT,
      },
    });

    expect(debitEntries).toHaveLength(1);
  });

  it('should return 404 when attempting to complete a refund that does not exist', async () => {
    const response = await request(app.getHttpServer() as Server).post(
      '/refunds/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/complete',
    );

    expect(response.status).toBe(404);
  });

  it('should not create duplicate DEBIT entries when the same refund is completed concurrently', async () => {
    await markPaymentAsCaptured();

    const createResponse = await request(app.getHttpServer() as Server)
      .post('/refunds')
      .send({
        payment_id: testPayment.id,
        amount: 10,
        reason: 'Concurrent refund test',
      });

    expect(createResponse.status).toBe(201);
    const body = createResponse.body as { id: string };

    const refundId = body.id;

    // Send both completion requests concurrently.
    const [firstResponse, secondResponse] = await Promise.all([
      request(app.getHttpServer() as Server).post(
        `/refunds/${refundId}/complete`,
      ),
      request(app.getHttpServer() as Server).post(
        `/refunds/${refundId}/complete`,
      ),
    ]);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    const firstBody = firstResponse.body as { status: string };
    const secondBody = secondResponse.body as { status: string };

    expect(firstBody.status).toBe(RefundStatus.COMPLETED);
    expect(secondBody.status).toBe(RefundStatus.COMPLETED);

    const debitEntries = await ledgerRepository.find({
      where: {
        refund: { id: refundId },
        type: LedgerEntryType.DEBIT,
      },
    });

    expect(debitEntries).toHaveLength(1);
    expect(Number(debitEntries[0].amount)).toBe(10);
  });
});
