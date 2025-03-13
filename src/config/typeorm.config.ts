import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "../entities/repository.entity";
import { join } from "path";

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "dpg-cv99hthu0jms73eh21j0-a",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || "github_actions_notifier",
  entities: [User, Repository],
  migrations: [join(__dirname, "../migrations/*.{ts,js}")],
  migrationsRun: true, // Automatically run migrations on startup
  synchronize: false, // Disable synchronize in production
  ssl: {
    rejectUnauthorized: false, // Required for Render.com PostgreSQL
  },
};
