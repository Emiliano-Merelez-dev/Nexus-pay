import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { LedgerEntry } from './entities/ledger_entry.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Payment } from 'src/payments/entities/payment.entity';
import { LedgerEntryType } from 'src/common/enums/ledgerEntries.enum';
import { Refund } from 'src/refunds/entities/refund.entity';

@Injectable()
export class LedgerEntriesService {
  private readonly logger = new Logger(LedgerEntriesService.name);
  constructor(
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepository: Repository<LedgerEntry>,
  ) {}

  async createEntryForCapturedPayment(payment: Payment): Promise<LedgerEntry> {
    try {
      const merchantId = payment.merchant?.id || payment.order?.merchant?.id;

      if (!merchantId) {
        throw new Error(
          `Cannot create ledger entry: Payment ${payment.id} lacks a valid merchant reference.`,
        );
      }

      const existingEntry = await this.ledgerRepository.findOne({
        where: {
          payment: { id: payment.id },
          type: LedgerEntryType.CREDIT,
        },
      });

      if (existingEntry) {
        return existingEntry;
      }

      const ledgerEntry = this.ledgerRepository.create({
        type: LedgerEntryType.CREDIT,
        amount: payment.total,
        currency: payment.currency || 'ARS',
        description: `Payment captured successfully for order ${payment.order?.id || 'N/A'} via ${payment.provider}`,
        payment: { id: payment.id },
        merchant: { id: merchantId },
        created_at: new Date(),
      });

      const savedEntry = await this.ledgerRepository.save(ledgerEntry);

      this.logger.log(
        `Ledger entry created successfully with ID: ${savedEntry.id} for payment ${payment.id}`,
      );

      return savedEntry;
    } catch (error) {
      this.logger.error(
        `Failed to create ledger entry for payment ${payment.id}`,
        error,
      );
      throw error;
    }
  }

  async findByMerchant(merchantId: string): Promise<LedgerEntry[]> {
    if (!merchantId) {
      throw new HttpException(
        'Merchant ID query parameter is required to fetch ledger entries',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.ledgerRepository.find({
      where: { merchant: { id: merchantId } },
      relations: { payment: true },
      order: { created_at: 'DESC' },
    });
  }

  async createEntryForCompletedRefund(
    refund: Refund,
    manager: EntityManager,
  ): Promise<LedgerEntry> {
    try {
      const merchantId =
        refund.payment?.merchant?.id || refund.payment?.order?.merchant?.id;

      if (!merchantId) {
        throw new Error(
          `Cannot create ledger entry: Refund ${refund.id} lacks a valid merchant reference.`,
        );
      }

      const ledgerRepository = manager.getRepository(LedgerEntry);

      const existingEntry = await ledgerRepository.findOne({
        where: {
          refund: { id: refund.id },
          type: LedgerEntryType.DEBIT,
        },
      });

      if (existingEntry) {
        return existingEntry;
      }

      const ledgerEntry = ledgerRepository.create({
        type: LedgerEntryType.DEBIT,
        amount: refund.amount,
        currency: refund.payment.currency || 'ARS',
        description: `Refund completed for payment ${refund.payment.id}`,
        payment: { id: refund.payment.id },
        merchant: { id: merchantId },
        refund: { id: refund.id },
        created_at: new Date(),
      });

      const savedEntry = await ledgerRepository.save(ledgerEntry);

      this.logger.log(
        `Refund ledger entry created successfully with ID: ${savedEntry.id} for refund ${refund.id}`,
      );

      return savedEntry;
    } catch (error) {
      this.logger.error(
        `Failed to create ledger entry for refund ${refund.id}`,
        error,
      );

      throw error;
    }
  }
}
