import { Module } from "@nestjs/common";
import { GitHubController } from "./github.controller";
import { TelegramModule } from "../telegram/telegram.module";
import { RepositoryConfigModule } from "../config/repository-config.module";

@Module({
  imports: [TelegramModule, RepositoryConfigModule],
  controllers: [GitHubController],
})
export class GitHubModule {}
