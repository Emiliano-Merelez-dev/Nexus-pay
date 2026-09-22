import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { In, Repository } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { OrderItem } from './entities/orderItem.entity';
import { PaymentStatus } from 'src/common/enums/payment.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, merchant_id, user_id } = createOrderDto;

    const productsIds = items.map((item) => item.product_id);

    const products = await this.productRepository.find({
      where: { id: In(productsIds) },
    });

    if (products.length != productsIds.length)
      throw new NotFoundException('no se encontraron todos los productos');

    let total = 0;
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);

      if (product) {
        total += Number(product?.price) * item.quantity;
      }
    }

    const queryRunner =
      this.orderRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        userId: user_id,
        merchantId: merchant_id,
        total,
        status: PaymentStatus.PENDING,
      });

      const saveOrder = await queryRunner.manager.save(order);

      const orderItemsToSave = items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return queryRunner.manager.create(OrderItem, {
          orderId: saveOrder.id,
          productId: item.product_id,
          merchantId: merchant_id,
          quantity: item.quantity,
          price: product!.price,
        });
      });

      await queryRunner.manager.save(orderItemsToSave);

      await queryRunner.commitTransaction();

      return saveOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: string) {
    return `This action returns a #${id} order`;
  }
}
