import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefundIdToLedgerEntry1791036252434 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Solo agregamos la columna refund_id a LedgerEntry
    await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD "refund_id" uuid`);

    // Opcional: Si quieres agregar la Foreign Key de una vez para mantener la integridad referencial:
    await queryRunner.query(
      `ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_ledger_entry_refund" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_ledger_entry_refund"`,
    );
    await queryRunner.query(
      `ALTER TABLE "LedgerEntry" DROP COLUMN "refund_id"`,
    );
  }
}
