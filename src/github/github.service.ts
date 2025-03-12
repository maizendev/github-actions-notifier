import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TelegramService } from "../telegram/telegram.service";
import { GithubWebhookPayload } from "./interfaces/github-webhook.interface";
import * as crypto from "crypto";

@Injectable()
export class GithubService {
  constructor(
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService
  ) {}

  private validateWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  async handleWebhook(payload: GithubWebhookPayload, signature: string) {
    if (!this.validateWebhookSignature(JSON.stringify(payload), signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (payload.action === "completed" && payload.workflow_run) {
      const repositoryName = payload.repository.full_name;
      const actionName = payload.workflow_run.name;
      const branch = payload.workflow_run.head_branch;
      const conclusion = payload.workflow_run.conclusion;

      const repositories = this.configService.get<any[]>("repositories");
      const repoConfig = repositories.find(
        (repo) => repo.name === repositoryName
      );

      if (repoConfig) {
        if (!repoConfig.actions || repoConfig.actions.includes(actionName)) {
          await this.telegramService.sendActionCompleteNotification(
            repoConfig.chatId,
            repositoryName,
            branch,
            conclusion,
            actionName
          );
        }
      }
    }

    return { status: "ok" };
  }
}
