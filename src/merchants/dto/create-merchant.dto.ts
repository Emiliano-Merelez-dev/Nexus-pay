import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsUUID()
  @IsNotEmpty()
  userId!: string; // El ID del usuario dueño del comercio
}
