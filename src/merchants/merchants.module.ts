import { Module } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, User])],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [TypeOrmModule],
})
export class MerchantsModule {}
