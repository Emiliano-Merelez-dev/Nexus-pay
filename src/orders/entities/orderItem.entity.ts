import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from 'src/products/entities/product.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Entity('orderItems')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'merchant_id' })
  merchantId!: string;

  @Column('int')
  quantity!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Merchant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;
}
