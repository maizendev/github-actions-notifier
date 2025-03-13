import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { TelegramModule } from "./telegram/telegram.module";
import { validate } from "./config/config.validation";
import { HealthModule } from "./health/health.module";
import { GitHubModule } from "./github/github.module";
import configuration from "./config/configuration";
import { User } from "./entities/user.entity";
import { Repository } from "./entities/repository.entity";
import { SeedService } from "./config/seed.service";
import { UsersModule } from "./users/users.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import { AppDataSource } from "./config/typeorm.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [configuration],
      cache: true,
      expandVariables: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([User, Repository]),
    TelegramModule,
    HealthModule,
    GitHubModule,
    UsersModule,
    RepositoriesModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
