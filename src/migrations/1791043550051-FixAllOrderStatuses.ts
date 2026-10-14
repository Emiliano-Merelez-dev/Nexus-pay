import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncOrderStatusEnum1791030000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Aseguramos que todos los estados del enum existan en PostgreSQL
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'pending';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'confirmed';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'cancelled';`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'completed';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL no permite eliminar valores de un ENUM nativamente.
  }
}
