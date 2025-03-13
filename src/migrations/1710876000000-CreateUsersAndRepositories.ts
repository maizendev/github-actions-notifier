import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersAndRepositories1710876000000
  implements MigrationInterface
{
  name = "CreateUsersAndRepositories1710876000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "telegramId" character varying NOT NULL,
                "username" character varying,
                "isAdmin" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_96aac72f1574b88752e9fb00089" UNIQUE ("telegramId"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "repositories" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "fullName" character varying NOT NULL,
                "actions" text array NOT NULL DEFAULT '{}',
                "webhookSecret" character varying NOT NULL,
                "userId" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_repositories" PRIMARY KEY ("id")
            )
        `);

    await queryRunner.query(`
            ALTER TABLE "repositories"
            ADD CONSTRAINT "FK_repositories_users"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "repositories" DROP CONSTRAINT "FK_repositories_users"
        `);
    await queryRunner.query(`DROP TABLE "repositories"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
