import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class WebhookPayloadDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  api_version?: string;

  @IsOptional()
  data?: {
    id?: string;
  };

  @IsOptional()
  @IsString()
  date_created?: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  topic?: string; // Para capturar 'merchant_order' u otros topics

  @IsOptional()
  @IsString()
  resource?: string; // URL del recurso que manda Mercado Pago

  @IsOptional()
  @IsNumber()
  user_id?: number;
}
