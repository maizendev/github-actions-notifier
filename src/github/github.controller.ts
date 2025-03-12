import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { TelegramService } from "../telegram/telegram.service";
import { ConfigService } from "@nestjs/config";
import { RepositoryConfigService } from "../config/repository-config.service";
import { WorkflowStateService } from "./workflow-state.service";
import * as crypto from "crypto";

interface WorkflowRunPayload {
  workflow_run: {
    id: number;
    head_branch: string;
    conclusion: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  repository: {
    full_name: string;
  };
}

@Controller("github")
export class GitHubController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    private readonly repositoryConfigService: RepositoryConfigService,
    private readonly workflowStateService: WorkflowStateService
  ) {
    // Запускаем периодическую очистку старых процессов каждый час
    setInterval(
      () => {
        this.workflowStateService.cleanupOldWorkflows();
      },
      60 * 60 * 1000
    );
  }

  @Post("webhook")
  async handleWebhook(
    @Headers("x-hub-signature-256") signature: string,
    @Headers("x-github-event") event: string,
    @Headers("x-github-hook-id") hookId: string,
    @Headers("x-github-delivery") delivery: string,
    @Headers("user-agent") userAgent: string,
    @Headers("x-github-hook-installation-target-type") targetType: string,
    @Headers("x-github-hook-installation-target-id") targetId: string,
    @Body() payload: WorkflowRunPayload
  ) {
    try {
      if (!this.verifySignature(payload, signature)) {
        throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
      }

      if (!userAgent?.startsWith("GitHub-Hookshot/")) {
        throw new HttpException("Invalid User-Agent", HttpStatus.UNAUTHORIZED);
      }

      if (event !== "workflow_run") {
        return { status: "ignored", event };
      }

      const { workflow_run, repository } = payload;
      const repositories =
        await this.repositoryConfigService.getAllRepositories();
      const repoConfigs = repositories.filter(
        (repo) => repo.name.toLowerCase() === repository.full_name.toLowerCase()
      );

      if (!repoConfigs.length) return;

      for (const config of repoConfigs) {
        if (workflow_run.status === "in_progress") {
          this.workflowStateService.addWorkflow({
            id: workflow_run.id,
            name: workflow_run.name,
            repository: repository.full_name,
            branch: workflow_run.head_branch,
            startedAt: new Date(workflow_run.created_at),
          });

          await this.telegramService.sendActionStartNotification(
            config.chatId,
            repository.full_name,
            workflow_run.head_branch,
            workflow_run.name
          );
        } else if (workflow_run.status === "completed") {
          const workflow = this.workflowStateService.getWorkflow(
            workflow_run.id,
            repository.full_name
          );
          let executionTime: number | undefined;

          if (workflow) {
            const startTime = workflow.startedAt;
            const endTime = new Date(workflow_run.updated_at);
            executionTime = Math.round(
              (endTime.getTime() - startTime.getTime()) / 1000
            );
            this.workflowStateService.removeWorkflow(
              workflow_run.id,
              repository.full_name
            );
          }

          await this.telegramService.sendActionCompleteNotification(
            config.chatId,
            repository.full_name,
            workflow_run.head_branch,
            workflow_run.conclusion,
            workflow_run.name,
            executionTime
          );
        }
      }

      return { status: "success" };
    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  }

  private verifySignature(payload: any, signature: string): boolean {
    const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
    const hmac = crypto.createHmac("sha256", secret);
    const calculatedSignature =
      "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature || ""),
      Buffer.from(calculatedSignature)
    );
  }
}
