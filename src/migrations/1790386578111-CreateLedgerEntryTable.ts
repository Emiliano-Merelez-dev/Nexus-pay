import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLedgerEntryTable1790386578111 implements MigrationInterface {
    name = 'CreateLedgerEntryTable1790386578111'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."LedgerEntry_type_enum" AS ENUM('credit', 'debit', 'fee')`);
        await queryRunner.query(`CREATE TABLE "LedgerEntry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."LedgerEntry_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "payment_id" uuid, "merchant_id" uuid, CONSTRAINT "PK_6e661732509403fab4ad550c679" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'authorized', 'captured', 'partially_refunded', 'refunded', 'disputed', 'failed')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_6784fa64d8e894b124b71153e21" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_7387eb6f3a7c32c5f2f37082d66" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_7387eb6f3a7c32c5f2f37082d66"`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_6784fa64d8e894b124b71153e21"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "status" character varying NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP TABLE "LedgerEntry"`);
        await queryRunner.query(`DROP TYPE "public"."LedgerEntry_type_enum"`);
    }

}
