import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  merchant_id!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsNumber()
  @IsNotEmpty()
  price!: number;
}
