import { IsEnum, IsUUID } from 'class-validator';
import { PaymentMethod, ProviderMethod } from 'src/common/enums/payment.enum';

export class CreatePaymentDto {
  @IsUUID()
  merchant_id!: string;

  @IsUUID()
  order_id!: string;

  @IsUUID()
  user_id!: string;

  @IsEnum(PaymentMethod, {
    message: 'payment_method must be a valid payment method',
  })
  payment_method!: PaymentMethod;

  @IsEnum(ProviderMethod, {
    message: 'payment_provider must be a valid provider method',
  })
  provider!: ProviderMethod;
}
