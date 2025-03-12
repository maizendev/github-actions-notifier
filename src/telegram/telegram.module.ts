import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramService } from "./telegram.service";
import { AppConfigModule } from "../config/config.module";
import { TelegramController } from "./telegram.controller";

@Module({
  imports: [ConfigModule, AppConfigModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
