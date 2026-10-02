import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { Repository } from 'typeorm';
import { Preference } from 'mercadopago';
import { Payment } from './entities/payment.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { WebhookPayloadDto } from './dto/create-webhook.dto';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig from 'mercadopago';
import { LedgerEntriesService } from 'src/ledger_entries/ledger_entries.service';

@Injectable()
export class PaymentsService {
  private mpClient: MercadoPagoConfig;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly configService: ConfigService,

    private readonly ledgerEntrysService: LedgerEntriesService,
  ) {
    const accessToken =
      (this.configService.get<string>('MP_ACCESS_TOKEN') as string) || '';

    this.mpClient = new MercadoPagoConfig({
      accessToken,
    });
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const { merchant_id, order_id, payment_method, user_id, provider } =
      createPaymentDto;

    const order = await this.orderRepository.findOne({
      where: { id: order_id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${order_id} not found`);
    }

    if (order.merchantId !== merchant_id) {
      throw new BadRequestException(`merchant id is not equal`);
    }

    if (order.userId !== user_id) {
      throw new BadRequestException(`user id is not equal`);
    }

    if (order.status === PaymentStatus.CAPTURED) {
      throw new BadRequestException(`order already payed`);
    }

    const preference = new Preference(this.mpClient);

    const mpResponse = await preference.create({
      body: {
        items: [
          {
            id: order.id,
            title: `Orden #${order.id.substring(0, 8)}`,
            quantity: 1,
            unit_price: Number(order.total),
          },
        ],
        back_urls: {
          success: 'http://localhost:3000/success',
          failure: 'http://localhost:3000/failure',
          pending: 'http://localhost:3000/pending',
        },
        notification_url:
          'https://glancing-hurled-crier.ngrok-free.dev/payments/webhook',
        external_reference: order.id,
      },
    });

    const payment = this.paymentRepository.create({
      currency: order.currency || 'USD',
      total: order.total,
      payment_method,
      provider,
      provider_reference_id: mpResponse.id,
      status: PaymentStatus.PENDING,
      merchant: { id: merchant_id },
      user: { id: user_id },
      order: { id: order_id },
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      message: 'payment initialized succesfully',
      init_point: mpResponse.init_point,
      sandbox_init_point: mpResponse.sandbox_init_point,
      payment: savedPayment,
    };
  }

  async handleWebhook(payload: WebhookPayloadDto) {
    let paymentId =
      payload.data?.id ||
      (payload as WebhookPayloadDto & { id?: string })?.id ||
      payload.resource;

    let orderIdFromWebhook = '';
    let paymentStatus = '';

    const rawTopic =
      payload.type ||
      payload.topic ||
      (payload as WebhookPayloadDto & { action?: string })?.action ||
      '';

    if (!paymentId && !payload.resource && !rawTopic) {
      return {
        received: true,
        message: 'Webhook notification acknowledged safely',
      };
    }

    try {
      if (rawTopic.includes('merchant_order') && payload.resource) {
        const parts = payload.resource.split('/');
        const merchantOrderId = parts[parts.length - 1];

        const merchantOrderClient = new (
          await import('mercadopago')
        ).MerchantOrder(this.mpClient);

        const merchantOrderInfo = await merchantOrderClient.get({
          merchantOrderId: Number(merchantOrderId),
        });

        orderIdFromWebhook = String(merchantOrderInfo.external_reference || '');

        if (
          merchantOrderInfo.payments &&
          merchantOrderInfo.payments.length > 0
        ) {
          const approvedPayment =
            merchantOrderInfo.payments.find((p) => p.status === 'approved') ||
            merchantOrderInfo.payments[0];

          paymentId = String(approvedPayment.id);
          paymentStatus = String(approvedPayment.status || '');
        }
      }

      if (paymentId && !orderIdFromWebhook) {
        const paymentClient = new (await import('mercadopago')).Payment(
          this.mpClient,
        );

        const mpPaymentInfo = await paymentClient.get({
          id: paymentId,
        });

        orderIdFromWebhook = String(mpPaymentInfo.external_reference || '');
        paymentStatus = String(mpPaymentInfo.status || '');
      }

      let payment: Payment | null = null;

      if (orderIdFromWebhook) {
        payment = await this.paymentRepository.findOne({
          where: {
            order: {
              id: orderIdFromWebhook,
            },
          },
          relations: {
            order: {
              merchant: true,
            },
            merchant: true,
          },
        });
      }

      if (!payment && paymentId) {
        payment = await this.paymentRepository.findOne({
          where: {
            provider_reference_id: paymentId,
          },
          relations: {
            order: {
              merchant: true,
            },
            merchant: true,
          },
        });
      }

      if (!payment) {
        return;
      }

      if (paymentStatus === 'approved') {
        payment.status = PaymentStatus.CAPTURED;

        if (payment.order) {
          payment.order.status = PaymentStatus.CAPTURED;
          await this.orderRepository.save(payment.order);
        }

        await this.paymentRepository.save(payment);

        await this.ledgerEntrysService.createEntryForCapturedPayment(payment);
      } else if (
        paymentStatus === 'rejected' ||
        paymentStatus === 'cancelled'
      ) {
        payment.status = PaymentStatus.FAILED;

        if (payment.order) {
          payment.order.status = PaymentStatus.FAILED;
          await this.orderRepository.save(payment.order);
        }
      }

      if (paymentId) {
        payment.provider_reference_id = paymentId;
      }

      await this.paymentRepository.save(payment);
    } catch (error) {
      console.error('Error processing Mercado Pago webhook:', error);
    }

    return {
      received: true,
      message: 'Webhook received and processing',
    };
  }

  findAll() {
    return this.paymentRepository.find({
      relations: {
        order: true,
        merchant: true,
        user: true,
      },
    });
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: {
        order: true,
        merchant: true,
        user: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }
}
