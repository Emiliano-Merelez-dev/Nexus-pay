import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdempotencyKey } from 'src/orders/entities/idempotency-key.entity';
import { Request, Response } from 'express'; // <-- Importamos los tipos de Express

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepo: Repository<IdempotencyKey>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ctx = context.switchToHttp();

    // Tipamos explícitamente como Request y Response para que el linter se calme
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const idempotencyKeyHeader = request.headers['idempotency-key'];

    if (!idempotencyKeyHeader) {
      return next.handle();
    }

    // Casteamos el body a un Record o interfaz genérica para evitar el warning de 'any'
    const body = request.body as Record<string, any>;
    const merchantId = body?.merchant_id as string;
    const path = request.url;

    if (!merchantId) {
      throw new HttpException(
        'Merchant ID is required in the body to process idempotency',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingRecord = await this.idempotencyRepo.findOne({
      where: {
        key: Array.isArray(idempotencyKeyHeader)
          ? idempotencyKeyHeader[0]
          : idempotencyKeyHeader,
        merchant: { id: merchantId },
        path: path,
      },
    });

    if (existingRecord) {
      response.status(existingRecord.response_code);
      return of(existingRecord.response_body);
    }

    return next.handle().pipe(
      tap((responseBody) => {
        // Ejecutamos la lógica asíncrona de guardado sin convertir la callback del tap en async y Sé que esto es una promesa asíncrona que corre en segundo plano y decido ignorar su retorno a propósito
        void (async () => {
          try {
            const statusCode = response.statusCode;

            const newRecord = this.idempotencyRepo.create({
              key: Array.isArray(idempotencyKeyHeader)
                ? idempotencyKeyHeader[0]
                : idempotencyKeyHeader,
              merchant: { id: merchantId },
              path: path,
              request_payload: request.body as Record<string, any>, // Casteo seguro
              response_code: statusCode,
              response_body: responseBody as Record<string, any>, // Casteo seguro
              created_at: new Date(),
            });

            await this.idempotencyRepo.save(newRecord);
          } catch (error) {
            console.error('Error saving idempotency key:', error);
          }
        })();
      }),
    );
  }
}
