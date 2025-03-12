import { Module } from "@nestjs/common";
import { GitHubController } from "./github.controller";
import { TelegramModule } from "../telegram/telegram.module";
import { ConfigModule } from "@nestjs/config";
import { RepositoryConfigService } from "../config/repository-config.service";
import { WorkflowStateService } from "./workflow-state.service";

@Module({
  imports: [TelegramModule, ConfigModule],
  controllers: [GitHubController],
  providers: [RepositoryConfigService, WorkflowStateService],
})
export class GitHubModule {}
