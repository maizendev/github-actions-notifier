import { MigrationInterface, QueryRunner } from "typeorm";
import { UserRole } from "../entities/user.entity";

export class AddUserRoles1710876000001 implements MigrationInterface {
  name = "AddUserRoles1710876000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM ('owner', 'admin', 'user')`
    );

    // Add role column
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."user_role_enum" NOT NULL DEFAULT 'user'`
    );

    // Drop isAdmin column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isAdmin"`);

    // Set owner role for specific telegram ID
    await queryRunner.query(`
            UPDATE "users" 
            SET "role" = 'owner' 
            WHERE "telegramId" = '505866066'
        `);

    // Set admin role for other admins
    await queryRunner.query(`
            UPDATE "users" 
            SET "role" = 'admin' 
            WHERE "telegramId" = '360646040'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add isAdmin column back
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isAdmin" boolean NOT NULL DEFAULT false`
    );

    // Set isAdmin based on role
    await queryRunner.query(`
            UPDATE "users" 
            SET "isAdmin" = true 
            WHERE "role" IN ('owner', 'admin')
        `);

    // Drop role column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
