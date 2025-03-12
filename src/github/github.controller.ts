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
    console.log("==> Webhook received with headers:", {
      signature,
      event,
      hookId,
      delivery,
      userAgent,
      targetType,
      targetId,
    });

    console.log("==> Webhook payload:", JSON.stringify(payload, null, 2));

    if (!this.verifySignature(payload, signature)) {
      console.error("==> Invalid signature detected");
      console.log(
        "==> Expected signature:",
        this.calculateExpectedSignature(payload)
      );
      console.log("==> Received signature:", signature);
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

    console.log("==> Signature verified successfully");

    if (!userAgent?.startsWith("GitHub-Hookshot/")) {
      console.error("==> Invalid User-Agent:", userAgent);
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
      console.log("==> Ignoring non-workflow_run event:", event);
      return { status: "ignored", event };
    }

    console.log("==> Processing workflow_run event");

    const { workflow_run, repository } = payload;
    const repositories =
      await this.repositoryConfigService.getAllRepositories();

    console.log("==> Found repositories config:", repositories);

    // Отправляем уведомления во все чаты, которые следят за этим репозиторием
    const repoConfigs = repositories.filter(
      (repo) => repo.name === repository.full_name
    );

    console.log("==> Matching repository configs:", repoConfigs);

    for (const repoConfig of repoConfigs) {
      try {
        console.log("==> Sending notification to chat:", repoConfig.chatId);
        await this.telegramService.sendActionCompleteNotification(
          repoConfig.chatId,
          repository.full_name,
          workflow_run.head_branch,
          workflow_run.conclusion,
          workflow_run.name
        );
        console.log(
          "==> Notification sent successfully to chat:",
          repoConfig.chatId
        );
      } catch (error) {
        console.error(
          `==> Failed to send notification to chat ${repoConfig.chatId}:`,
          error
        );
      }
    }

    return { status: "success" };
  }

  private verifySignature(payload: any, signature: string): boolean {
    const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
    console.log("==> Using webhook secret:", secret);
    const hmac = crypto.createHmac("sha256", secret);
    const calculatedSignature =
      "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
    console.log("==> Calculated signature:", calculatedSignature);
    console.log("==> Received signature:", signature);
    return crypto.timingSafeEqual(
      Buffer.from(signature || ""),
      Buffer.from(calculatedSignature)
    );
  }

  private calculateExpectedSignature(payload: any): string {
    const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
  }
}
