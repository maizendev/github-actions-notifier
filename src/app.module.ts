import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramModule } from "./telegram/telegram.module";
import { AppConfigModule } from "./config/config.module";
import { validate } from "./config/config.validation";
import { RepositoryConfigModule } from "./config/repository-config.module";
import { HealthModule } from "./health/health.module";
import { GitHubModule } from "./github/github.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [configuration],
      cache: true,
      expandVariables: true,
    }),
    AppConfigModule,
    RepositoryConfigModule,
    TelegramModule,
    HealthModule,
    GitHubModule,
  ],
})
export class AppModule {}
