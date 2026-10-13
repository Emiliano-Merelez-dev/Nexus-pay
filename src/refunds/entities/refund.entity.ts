import { RefundStatus } from 'src/common/enums/refund-status.enum';
import { Payment } from 'src/payments/entities/payment.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'refunds' })
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment!: Payment;
}
