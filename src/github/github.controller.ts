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
import * as crypto from "crypto";

interface WorkflowRunPayload {
  workflow_run: {
    head_branch: string;
    conclusion: string;
    name: string;
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
    private readonly repositoryConfigService: RepositoryConfigService
  ) {}

  @Post("webhook")
  async handleWebhook(
    @Headers("x-hub-signature-256") signature: string,
    @Headers("x-github-event") event: string,
    @Headers("x-github-hook-id") hookId: string,
    @Headers("x-github-delivery") delivery: string,
    @Headers("user-agent") userAgent: string,
    @Headers("x-github-hook-installation-target-type") targetType: string,
    @Headers("x-github-hook-installation-target-id") targetId: string,
    @Body() payload: any
  ) {
    if (!this.verifySignature(payload, signature)) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

    if (!userAgent?.startsWith("GitHub-Hookshot/")) {
      throw new HttpException("Invalid User-Agent", HttpStatus.UNAUTHORIZED);
    }

    console.log({
      hookId,
      delivery,
      event,
      targetType,
      targetId,
      repository: payload.repository?.full_name,
    });

    if (event !== "workflow_run") {
      return { status: "ignored", event };
    }

    const { workflow_run, repository } = payload;
    const repositories =
      await this.repositoryConfigService.getAllRepositories();

    // Отправляем уведомления во все чаты, которые следят за этим репозиторием
    const repoConfigs = repositories.filter(
      (repo) => repo.name === repository.full_name
    );

    for (const repoConfig of repoConfigs) {
      try {
        await this.telegramService.sendActionCompleteNotification(
          repoConfig.chatId, // chatId уже преобразован в число в getRepositories
          repository.full_name,
          workflow_run.head_branch,
          workflow_run.conclusion,
          workflow_run.name
        );
      } catch (error) {
        console.error(
          `Failed to send notification to chat ${repoConfig.chatId}:`,
          error
        );
      }
    }

    return { status: "success" };
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
