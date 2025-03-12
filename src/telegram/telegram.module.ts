import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramService } from "./telegram.service";
import { AppConfigModule } from "../config/config.module";

@Module({
  imports: [ConfigModule, AppConfigModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
