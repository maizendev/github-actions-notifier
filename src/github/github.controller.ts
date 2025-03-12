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
    @Body() payload: any
  ) {
    // Проверка подписи
    if (!this.verifySignature(payload, signature)) {
      throw new HttpException("Invalid signature", HttpStatus.UNAUTHORIZED);
    }

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
