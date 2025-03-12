import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramModule } from "./telegram/telegram.module";
import { AppConfigModule } from "./config/config.module";
import { validate } from "./config/config.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    AppConfigModule,
    TelegramModule,
  ],
})
export class AppModule {}
