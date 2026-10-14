import { LedgerEntryType } from 'src/common/enums/ledgerEntries.enum';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { Refund } from 'src/refunds/entities/refund.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('IDX_ledger_payment_credit_unique', ['payment', 'type'], {
  unique: true,
  where: `"type" = 'credit'`,
})
@Index('IDX_ledger_refund_debit_unique', ['refund', 'type'], {
  unique: true,
  where: `"type" = 'debit'`,
})
@Entity({ name: 'LedgerEntry' })
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: LedgerEntryType,
  })
  type!: LedgerEntryType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;

  @ManyToOne(() => Refund, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refund_id' })
  refund!: Refund;
}
