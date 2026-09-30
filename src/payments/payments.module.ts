import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order, User, Merchant])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
