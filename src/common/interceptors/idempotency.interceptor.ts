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

import { Request, Response } from 'express';

interface IdempotentRequestBody extends Record<string, unknown> {
  merchant_id?: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepo: Repository<IdempotencyKey>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const path = request.url;

    if (path.includes('/webhook') || request.method === 'GET') {
      return next.handle();
    }

    const idempotencyKeyHeader = request.headers['idempotency-key'];

    if (!idempotencyKeyHeader) {
      return next.handle();
    }

    const idempotencyKey = Array.isArray(idempotencyKeyHeader)
      ? idempotencyKeyHeader[0]
      : idempotencyKeyHeader;

    const body = (request.body ?? {}) as IdempotentRequestBody;
    const merchantId = body.merchant_id;

    if (!merchantId || typeof merchantId !== 'string') {
      throw new HttpException(
        'Valid Merchant ID is required in the body for idempotent requests',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingRecord = await this.idempotencyRepo.findOne({
      where: {
        key: idempotencyKey,
        merchant: { id: merchantId },
        path: path,
      },
    });

    if (existingRecord) {
      response.status(existingRecord.response_code);
      return of(existingRecord.response_body);
    }

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        void (async () => {
          try {
            const statusCode = response.statusCode;

            if (statusCode >= 400) {
              return;
            }

            const newRecord = this.idempotencyRepo.create({
              key: idempotencyKey,
              merchant: { id: merchantId },
              path: path,
              request_payload: body,
              response_code: statusCode,
              response_body: responseBody as Record<string, unknown>,
              created_at: new Date(),
            });

            await this.idempotencyRepo.save(newRecord);
          } catch (error) {
            console.error('Error saving idempotency record:', error);
          }
        })();
      }),
    );
  }
}
