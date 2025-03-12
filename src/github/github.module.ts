import { Module } from "@nestjs/common";
import { GitHubController } from "./github.controller";
import { TelegramModule } from "../telegram/telegram.module";

@Module({
  imports: [TelegramModule],
  controllers: [GitHubController],
})
export class GitHubModule {}
