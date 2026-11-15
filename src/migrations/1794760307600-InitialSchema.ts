import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794760307600 implements MigrationInterface {
    name = 'InitialSchema1794760307600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "business_name" character varying NOT NULL, CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "merchant_id" uuid NOT NULL, "title" character varying NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orderItems" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_b1b864ba2b7d5762d34265cc8b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'completed')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'ARS', "total" numeric(10,2) NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "idempotency_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "path" character varying NOT NULL, "request_payload" json, "response_code" integer NOT NULL, "response_body" json, "locked_until" TIMESTAMP, "created_at" date NOT NULL, "merchant_id" uuid, CONSTRAINT "PK_213f125e14469be304f9ff1d452" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('credit_card', 'debit_card', 'bank_transfer')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_provider_enum" AS ENUM('stripe', 'mercado_pago', 'paypal')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'authorized', 'captured', 'partially_refunded', 'refunded', 'disputed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "currency" character varying(3) NOT NULL, "payment_method" "public"."payments_payment_method_enum" NOT NULL, "provider" "public"."payments_provider_enum" NOT NULL, "provider_reference_id" character varying, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "total" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" uuid, "user_id" uuid, "order_id" uuid, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."refunds_status_enum" AS ENUM('pending', 'completed', 'failed')`);
        await queryRunner.query(`CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(10,2) NOT NULL, "reason" character varying, "status" "public"."refunds_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "payment_id" uuid, CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."LedgerEntry_type_enum" AS ENUM('credit', 'debit', 'fee')`);
        await queryRunner.query(`CREATE TABLE "LedgerEntry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."LedgerEntry_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "payment_id" uuid, "merchant_id" uuid, "refund_id" uuid, CONSTRAINT "PK_6e661732509403fab4ad550c679" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ledger_refund_debit_unique" ON "LedgerEntry"  ("refund_id", "type") WHERE "type" = 'debit'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ledger_payment_credit_unique" ON "LedgerEntry"  ("payment_id", "type") WHERE "type" = 'credit'`);
        await queryRunner.query(`ALTER TABLE "merchants" ADD CONSTRAINT "FK_698f612a3134c503f711479a4e5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_7d80d63e220c4511ab4b6595846" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orderItems" ADD CONSTRAINT "FK_d59ce5e618c2c16792fcd50a556" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orderItems" ADD CONSTRAINT "FK_2f57be2fb8926de7ee485e8e13a" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orderItems" ADD CONSTRAINT "FK_7be2703f747fe9be9e017c5db0d" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "idempotency_key" ADD CONSTRAINT "FK_2d457710fe8b7e6a9c7a6d4f8fa" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_c4a9a77d8ec9c37d3654a0d2ebc" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refunds" ADD CONSTRAINT "FK_7f48aa5d56c42aeb495db016683" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_6784fa64d8e894b124b71153e21" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_7387eb6f3a7c32c5f2f37082d66" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" ADD CONSTRAINT "FK_1fe219bbfebfe36aa76b3632ae6" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_1fe219bbfebfe36aa76b3632ae6"`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_7387eb6f3a7c32c5f2f37082d66"`);
        await queryRunner.query(`ALTER TABLE "LedgerEntry" DROP CONSTRAINT "FK_6784fa64d8e894b124b71153e21"`);
        await queryRunner.query(`ALTER TABLE "refunds" DROP CONSTRAINT "FK_7f48aa5d56c42aeb495db016683"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_c4a9a77d8ec9c37d3654a0d2ebc"`);
        await queryRunner.query(`ALTER TABLE "idempotency_key" DROP CONSTRAINT "FK_2d457710fe8b7e6a9c7a6d4f8fa"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "orderItems" DROP CONSTRAINT "FK_7be2703f747fe9be9e017c5db0d"`);
        await queryRunner.query(`ALTER TABLE "orderItems" DROP CONSTRAINT "FK_2f57be2fb8926de7ee485e8e13a"`);
        await queryRunner.query(`ALTER TABLE "orderItems" DROP CONSTRAINT "FK_d59ce5e618c2c16792fcd50a556"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_7d80d63e220c4511ab4b6595846"`);
        await queryRunner.query(`ALTER TABLE "merchants" DROP CONSTRAINT "FK_698f612a3134c503f711479a4e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_payment_credit_unique"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ledger_refund_debit_unique"`);
        await queryRunner.query(`DROP TABLE "LedgerEntry"`);
        await queryRunner.query(`DROP TYPE "public"."LedgerEntry_type_enum"`);
        await queryRunner.query(`DROP TABLE "refunds"`);
        await queryRunner.query(`DROP TYPE "public"."refunds_status_enum"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_payment_method_enum"`);
        await queryRunner.query(`DROP TABLE "idempotency_key"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "orderItems"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "merchants"`);
    }

}
