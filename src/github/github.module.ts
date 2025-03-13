import { Module } from "@nestjs/common";
import { GitHubController } from "./github.controller";
import { TelegramModule } from "../telegram/telegram.module";
import { WorkflowStateService } from "./workflow-state.service";
import { RepositoriesModule } from "../repositories/repositories.module";

@Module({
  imports: [TelegramModule, RepositoriesModule],
  controllers: [GitHubController],
  providers: [WorkflowStateService],
})
export class GitHubModule {}
