import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-orderItem.dto';

export class CreateOrderDto {
  @IsUUID()
  user_id!: string;

  @IsUUID()
  merchant_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
