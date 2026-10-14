import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledToOrderStatus1790989899792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregamos 'cancelled' al ENUM existente de forma limpia y atómica
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'cancelled';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no soporta DROP VALUE en enums de forma nativa, por lo que se deja vacío.
  }
}
