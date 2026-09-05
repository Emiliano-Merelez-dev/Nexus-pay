import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { merchant_id, title, price } = createProductDto;

    const merchant = await this.merchantRepository.findOneBy({
      id: merchant_id,
    });
    if (!merchant) {
      throw new NotFoundException(
        `El merchant con ID ${merchant_id} no existe.`,
      );
    }
    const product = this.productRepository.create({
      title,
      price,
      merchantId: merchant_id,
    });

    return await this.productRepository.save(product);
  }

  async findAll() {
    return await this.productRepository.find({
      relations: { merchant: true },
    });
  }
}
