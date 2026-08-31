import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createMerchantDto: CreateMerchantDto) {
    const { userId, businessName } = createMerchantDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`user with id${userId} not found`);
    }

    const merchant = this.merchantRepository.create({
      businessName,
      userId,
    });

    return await this.merchantRepository.save(merchant);
  }

  async findAll() {
    return await this.merchantRepository.find({
      relations: { user: true },
    });
  }
}
