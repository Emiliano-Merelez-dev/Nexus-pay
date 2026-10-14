import { Module } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Refund } from './entities/refund.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { LedgerEntriesService } from 'src/ledger_entries/ledger_entries.service';
import { LedgerEntry } from 'src/ledger_entries/entities/ledger_entry.entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Refund, Payment, LedgerEntry, Order])],
  controllers: [RefundsController],
  providers: [RefundsService, LedgerEntriesService],
})
export class RefundsModule {}
