import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductsTable1787247329695 implements MigrationInterface {
    name = 'CreateProductsTable1787247329695'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "merchant_id" uuid NOT NULL, "title" character varying NOT NULL, "price" numeric(10,2) NOT NULL, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_7d80d63e220c4511ab4b6595846" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_7d80d63e220c4511ab4b6595846"`);
        await queryRunner.query(`DROP TABLE "products"`);
    }

}
