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
import * as crypto from "crypto";

@Controller("github")
export class GitHubController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService
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

    // Отправка уведомления через Telegram
    await this.telegramService.sendActionCompleteNotification(
      Number(process.env.ADMIN_IDS[0]), // или получите chatId из конфигурации
      repository.full_name,
      workflow_run.head_branch,
      workflow_run.conclusion,
      workflow_run.name
    );

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
