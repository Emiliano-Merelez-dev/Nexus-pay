import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Refund } from './entities/refund.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { RefundStatus } from 'src/common/enums/refund-status.enum';
import { OrderStatus, PaymentStatus } from 'src/common/enums/payment.enum';
import { LedgerEntriesService } from 'src/ledger_entries/ledger_entries.service';
import { Order } from 'src/orders/entities/order.entity';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,

    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly ledgerEntriesService: LedgerEntriesService,
  ) {}

  async createRefund(
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<Refund> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    if (
      payment.status !== PaymentStatus.CAPTURED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('Only captured payments can be refunded');
    }

    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    const existingRefunds = await this.refundRepository.find({
      where: {
        payment: { id: paymentId },
        status: RefundStatus.COMPLETED,
      },
    });

    const refundedAmount = existingRefunds.reduce(
      (total, refund) => total + Number(refund.amount),
      0,
    );

    const remainingAmount = Number(payment.total) - refundedAmount;

    if (amount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount exceeds the remaining refundable amount of ${remainingAmount}`,
      );
    }

    const refund = this.refundRepository.create({
      amount,
      reason,
      status: RefundStatus.PENDING,
      payment: { id: paymentId },
    });

    return this.refundRepository.save(refund);
  }

  async completeRefund(id: string): Promise<Refund> {
    return this.refundRepository.manager.transaction(async (manager) => {
      const refundToLock = await manager
        .getRepository(Refund)
        .createQueryBuilder('refund')
        .where('refund.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!refundToLock) {
        throw new NotFoundException(`Refund with ID ${id} not found`);
      }

      const refund = await manager.findOne(Refund, {
        where: { id },
        relations: {
          payment: {
            merchant: true,
            order: { merchant: true },
          },
        },
        loadEagerRelations: false,
      });

      if (!refund) {
        throw new NotFoundException(`Refund with ID ${id} not found`);
      }

      if (refund.status === RefundStatus.COMPLETED) {
        return refund;
      }

      refund.status = RefundStatus.COMPLETED;
      const updatedRefund = await manager.save(Refund, refund);

      await this.ledgerEntriesService.createEntryForCompletedRefund(
        updatedRefund,
        manager,
      );

      const payment = refund.payment;

      const allCompletedRefunds = await manager.find(Refund, {
        where: {
          payment: { id: payment.id },
          status: RefundStatus.COMPLETED,
        },
      });

      const totalRefunded = allCompletedRefunds.reduce(
        (sum, currentRefund) => sum + Number(currentRefund.amount),
        0,
      );

      if (totalRefunded >= Number(payment.total)) {
        payment.status = PaymentStatus.REFUNDED;

        if (payment.order) {
          payment.order.status = OrderStatus.CANCELLED;
          await manager.save(Order, payment.order);
        }
      } else {
        payment.status = PaymentStatus.PARTIALLY_REFUNDED;
      }

      await manager.save(Payment, payment);

      return updatedRefund;
    });
  }
}
