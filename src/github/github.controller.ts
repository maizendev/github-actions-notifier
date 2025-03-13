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
import { ConfigService } from "@nestjs/config";
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
    private readonly workflowStateService: WorkflowStateService,
    private readonly configService: ConfigService
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

  private verifySignature(payload: any, signature: string): boolean {
    if (!signature) return false;

    const webhookSecret = this.configService.get<string>(
      "GITHUB_WEBHOOK_SECRET"
    );
    if (!webhookSecret) {
      throw new HttpException(
        "Webhook secret not configured",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const rawPayload = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const digest = "sha256=" + hmac.update(rawPayload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
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
      console.log("Received webhook:", {
        event,
        signature: signature ? "present" : "missing",
        repository: payload?.repository?.full_name,
        workflow: payload?.workflow_run?.name,
        status: payload?.workflow_run?.status,
      });

      if (!this.validatePayload(payload)) {
        console.error("Invalid payload format:", payload);
        throw new HttpException(
          "Invalid payload format",
          HttpStatus.BAD_REQUEST
        );
      }

      if (!this.verifySignature(payload, signature)) {
        console.error("Invalid signature:", {
          received: signature,
          expected: this.generateExpectedSignature(payload),
        });
        throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
      }

      if (event !== "workflow_run") {
        console.log("Ignoring non-workflow event:", event);
        return { status: "ignored", event };
      }

      const { workflow_run, repository } = payload;
      const repositoryName = repository.full_name.toLowerCase();
      console.log("Looking for repositories:", repositoryName);

      const repositories =
        await this.repositoriesService.findByFullName(repositoryName);

      if (!repositories.length) {
        console.log("No matching repositories found");
        return { status: "no matching repositories" };
      }

      console.log(
        "Found repositories:",
        repositories.map((r) => ({
          name: r.name,
          actions: r.actions,
        }))
      );

      for (const repo of repositories) {
        if (!this.shouldProcessAction(repo, workflow_run.name)) {
          console.log("Skipping action:", {
            repo: repo.name,
            action: workflow_run.name,
          });
          continue;
        }

        if (workflow_run.status === "in_progress") {
          console.log("Processing workflow start:", {
            repo: repository.full_name,
            action: workflow_run.name,
            branch: workflow_run.head_branch,
          });

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
          console.log("Processing workflow completion:", {
            repo: repository.full_name,
            action: workflow_run.name,
            conclusion: workflow_run.conclusion,
          });

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
            parseInt(repo.user.telegramId, 10),
            repository.full_name,
            workflow_run.head_branch,
            workflow_run.conclusion,
            workflow_run.name,
            executionTime
          );
        }
      }

      console.log("Webhook processed successfully");
      return { status: "success" };
    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  }

  private generateExpectedSignature(payload: any): string {
    const webhookSecret = this.configService.get<string>(
      "GITHUB_WEBHOOK_SECRET"
    );
    const rawPayload = JSON.stringify(payload);
    const hmac = crypto.createHmac("sha256", webhookSecret);
    return "sha256=" + hmac.update(rawPayload).digest("hex");
  }
}
