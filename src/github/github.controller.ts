import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { TelegramService } from "../telegram/telegram.service";
import { RepositoriesService } from "../repositories/repositories.service";
import { WorkflowStateService } from "./workflow-state.service";
import { ThrottlerGuard } from "@nestjs/throttler";
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
@UseGuards(ThrottlerGuard)
export class GitHubController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly repositoriesService: RepositoriesService,
    private readonly workflowStateService: WorkflowStateService
  ) {}

  private validatePayload(payload: any): payload is WorkflowRunPayload {
    return (
      payload &&
      payload.workflow_run &&
      typeof payload.workflow_run.id === "number" &&
      typeof payload.workflow_run.head_branch === "string" &&
      typeof payload.workflow_run.name === "string" &&
      typeof payload.workflow_run.status === "string" &&
      typeof payload.workflow_run.created_at === "string" &&
      typeof payload.workflow_run.updated_at === "string" &&
      payload.repository &&
      typeof payload.repository.full_name === "string"
    );
  }

  private async verifySignature(
    payload: any,
    signature: string
  ): Promise<boolean> {
    if (!signature) return false;

    const repos = await this.repositoriesService.findByFullName(
      payload.repository.full_name
    );
    if (!repos || repos.length === 0) return false;

    for (const repo of repos) {
      const hmac = crypto.createHmac("sha256", repo.webhookSecret);
      const digest =
        "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return true;
      }
    }
    return false;
  }

  private shouldProcessAction(repo: any, actionName: string): boolean {
    if (!repo.actions || repo.actions.length === 0) return true;
    return repo.actions.includes(actionName);
  }

  @Post("webhook")
  async handleWebhook(
    @Headers("x-hub-signature-256") signature: string,
    @Headers("x-github-event") event: string,
    @Body() payload: WorkflowRunPayload
  ) {
    try {
      if (!this.validatePayload(payload)) {
        throw new HttpException(
          "Invalid payload format",
          HttpStatus.BAD_REQUEST
        );
      }

      if (!(await this.verifySignature(payload, signature))) {
        throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
      }

      if (event !== "workflow_run") {
        return { status: "ignored", event };
      }

      const { workflow_run, repository } = payload;
      const repositories = await this.repositoriesService.findByFullName(
        repository.full_name
      );

      if (!repositories.length) return { status: "no matching repositories" };

      for (const repo of repositories) {
        if (!this.shouldProcessAction(repo, workflow_run.name)) {
          continue;
        }

        if (workflow_run.status === "in_progress") {
          this.workflowStateService.addWorkflow({
            id: workflow_run.id,
            name: workflow_run.name,
            repository: repository.full_name,
            branch: workflow_run.head_branch,
            startedAt: new Date(workflow_run.created_at),
          });

          await this.telegramService.sendActionStartNotification(
            parseInt(repo.user.telegramId, 10),
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
            const startTime = new Date(workflow_run.created_at);
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
            parseInt(repo.user.telegramId, 10),
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
}
