import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

export function handleDBExceptions(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const dbError = error as { code: string };

    if (dbError.code === '23505') {
      throw new ConflictException('The record already exists in the database.');
    }
  }

  throw new InternalServerErrorException(
    'An unexpected error occurred in the database.',
  );
}
