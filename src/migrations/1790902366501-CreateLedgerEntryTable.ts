import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLedgerEntryTable1790902366501 implements MigrationInterface {
    name = 'CreateLedgerEntryTable1790902366501'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_71dd11bf16c385a63e463075f3" ON "LedgerEntry"  ("payment_id", "type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_71dd11bf16c385a63e463075f3"`);
    }

}
