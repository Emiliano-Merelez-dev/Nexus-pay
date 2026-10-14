import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIdempotencyKeyTable1789262338416 implements MigrationInterface {
    name = 'CreateIdempotencyKeyTable1789262338416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "idempotency_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "path" character varying NOT NULL, "request_payload" json, "response_code" integer NOT NULL, "response_body" json, "locked_until" TIMESTAMP, "created_at" date NOT NULL, "merchant_id" uuid, CONSTRAINT "PK_213f125e14469be304f9ff1d452" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "idempotency_key" ADD CONSTRAINT "FK_2d457710fe8b7e6a9c7a6d4f8fa" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "idempotency_key" DROP CONSTRAINT "FK_2d457710fe8b7e6a9c7a6d4f8fa"`);
        await queryRunner.query(`DROP TABLE "idempotency_key"`);
    }

}
