import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { RepositoryConfigModule } from "../config/repository-config.module";
import { Telegraf } from "telegraf";

@Module({
  imports: [ConfigModule, RepositoryConfigModule],
  controllers: [TelegramController],
  providers: [
    {
      provide: Telegraf,
      useFactory: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
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
