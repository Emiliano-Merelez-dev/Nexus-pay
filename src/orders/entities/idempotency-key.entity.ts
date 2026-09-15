import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'idempotency_key' })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  key!: string;

  @Column()
  path!: string;

  @Column({ type: 'json', nullable: true })
  request_payload: any;

  @Column('int')
  response_code!: number;

  @Column({ type: 'json', nullable: true })
  response_body: any;

  @Column({ type: 'timestamp', nullable: true })
  locked_until!: Date;

  @Column('date')
  created_at!: Date;

  @ManyToOne(() => Merchant, (merchant) => merchant.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;
}
