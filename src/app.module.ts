import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramModule } from "./telegram/telegram.module";
import { AppConfigModule } from "./config/config.module";
import { validate } from "./config/config.validation";
import { RepositoryConfigModule } from "./config/repository-config.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AppConfigModule,
    RepositoryConfigModule,
    TelegramModule,
    HealthModule,
  ],
})
export class AppModule {}
