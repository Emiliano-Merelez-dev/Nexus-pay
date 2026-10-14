import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOrdersTable1789404930481 implements MigrationInterface {
    name = 'CreateOrdersTable1789404930481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "currency" character varying(3) NOT NULL DEFAULT 'ARS'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "currency"`);
    }

}
