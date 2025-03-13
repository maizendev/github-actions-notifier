import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthController } from "./health.controller";
import { KeepAliveService } from "./keep-alive.service";
import { TelegramModule } from "../telegram/telegram.module";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    TelegramModule,
    TypeOrmModule.forFeature([]),
  ],
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class HealthModule {}
