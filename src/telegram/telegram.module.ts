import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { RepositoryConfigModule } from "../config/repository-config.module";
import { UsersModule } from "../users/users.module";
import { Telegraf } from "telegraf";

@Module({
  imports: [ConfigModule, RepositoryConfigModule, UsersModule],
  controllers: [TelegramController],
  providers: [
    {
      provide: Telegraf,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
        if (!token) {
          throw new Error("TELEGRAM_BOT_TOKEN is not defined");
        }
        return new Telegraf(token);
      },
    },
    TelegramService,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
