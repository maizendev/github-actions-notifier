import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { AppConfigService } from "../config/config.service";
import { RepositoryConfig } from "../config/interfaces/repository.interface";
import { RepositoryConfigService } from "../config/repository-config.service";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly ADMIN_IDS: number[];

  constructor(
    private configService: ConfigService,
    private appConfigService: AppConfigService,
    private repositoryConfigService: RepositoryConfigService
  ) {
    const token = this.configService.get<string>("telegram.botToken");
    if (!token) {
      console.error("Telegram bot token not found in configuration");
      throw new Error("Telegram bot token is required");
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      console.log("Telegram bot successfully initialized");

      this.ADMIN_IDS = JSON.parse(
        this.configService.get<string>("ADMIN_IDS", "[]")
      );
      console.log(`Configured admin IDs: ${this.ADMIN_IDS.join(", ")}`);

      this.setupCommands();
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
      throw error;
    }
  }

  private setupCommands() {
    try {
      this.bot.onText(/\/start/, this.handleStart.bind(this));
      this.bot.onText(/\/watch (.+)/, this.handleWatchRepo.bind(this));
      this.bot.onText(/\/unwatch (.+)/, this.handleUnwatchRepo.bind(this));
      this.bot.onText(/\/list/, this.handleListRepos.bind(this));
      console.log("Telegram bot commands successfully configured");
    } catch (error) {
      console.error("Failed to setup bot commands:", error);
      throw error;
    }
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(msg.from?.id || 0);

    let message = "Hello! I'm a bot for GitHub Actions notifications.\n\n";
    if (isAdmin) {
      message += "Available commands:\n";
      message += "/watch owner/repo - Start watching a repository\n";
      message += "/unwatch owner/repo - Stop watching a repository\n";
      message += "/list - Show list of watched repositories";
    }

    await this.sendMessage(chatId, message);
  }

  private async handleWatchRepo(
    msg: TelegramBot.Message,
    match: RegExpExecArray
  ) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    try {
      if (!this.isAdmin(userId)) {
        await this.sendMessage(
          chatId,
          "You don't have permission to execute this command."
        );
        console.warn(
          `Unauthorized watch attempt by user ${userId} in chat ${chatId}`
        );
        return;
      }

      const repoName = match[1];
      console.log(
        `Processing watch command for repository ${repoName} in chat ${chatId}`
      );

      if (!this.isValidRepoName(repoName)) {
        await this.sendMessage(
          chatId,
          "❌ Invalid repository name format. Use format: owner/repository"
        );
        return;
      }

      const exists = await this.repositoryConfigService.repositoryExists(
        repoName,
        chatId.toString()
      );
      if (exists) {
        await this.sendMessage(
          chatId,
          "❌ This repository is already being watched in this chat"
        );
        return;
      }

      await this.repositoryConfigService.addRepository({
        name: repoName,
        chatId: chatId.toString(),
        addedAt: new Date().toISOString(),
      });

      const webhookSecret =
        await this.repositoryConfigService.getWebhookSecret(repoName);

      await this.sendMessage(
        chatId,
        `✅ Now watching repository ${repoName}\n\n` +
          `⚠️ GitHub webhook setup:\n` +
          `1. Go to Settings -> Webhooks\n` +
          `2. Add webhook\n` +
          `3. Payload URL: ${this.configService.get("APP_URL")}/github/webhook\n` +
          `4. Content type: application/json\n` +
          `5. Secret: ${webhookSecret}\n` +
          `6. In "Which events would you like to trigger this webhook?"\n` +
          `   select "Let me select individual events" → "Workflow runs"`
      );
    } catch (error) {
      console.error(`Error in handleWatchRepo for chat ${chatId}:`, error);
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }

  private isValidRepoName(repoName: string): boolean {
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoName);
  }

  private async handleUnwatchRepo(
    msg: TelegramBot.Message,
    match: RegExpExecArray
  ) {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    try {
      if (!this.isAdmin(userId)) {
        await this.sendMessage(
          chatId,
          "You don't have permission to execute this command."
        );
        console.warn(
          `Unauthorized unwatch attempt by user ${userId} in chat ${chatId}`
        );
        return;
      }

      const repoName = match[1];
      if (!this.isValidRepoName(repoName)) {
        await this.sendMessage(
          chatId,
          "❌ Invalid repository name format. Use format: owner/repository"
        );
        return;
      }

      const exists = await this.repositoryConfigService.repositoryExists(
        repoName,
        chatId.toString()
      );
      if (!exists) {
        await this.sendMessage(
          chatId,
          "❌ This repository is not being watched in this chat"
        );
        return;
      }

      await this.repositoryConfigService.removeRepository(
        repoName,
        chatId.toString()
      );

      console.log(`Repository ${repoName} unwatched in chat ${chatId}`);
      await this.sendMessage(
        chatId,
        `✅ Repository ${repoName} is no longer being watched!`
      );
    } catch (error) {
      console.error(`Error in handleUnwatchRepo for chat ${chatId}:`, error);
      await this.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }

  private async handleListRepos(msg: TelegramBot.Message) {
    if (!this.isAdmin(msg.from?.id)) {
      await this.sendMessage(
        msg.chat.id,
        "You don't have permission to execute this command."
      );
      return;
    }

    try {
      const repositories =
        await this.repositoryConfigService.getRepositoriesForChat(
          msg.chat.id.toString()
        );

      if (repositories.length === 0) {
        await this.sendMessage(
          msg.chat.id,
          "No repositories are being watched."
        );
        return;
      }

      const message = repositories
        .map(
          (repo) =>
            `📦 ${repo.name}\n   Chat: ${repo.chatId}\n   Actions: ${repo.actions?.join(", ") || "all"}\n   Added: ${repo.addedAt}`
        )
        .join("\n\n");

      await this.sendMessage(msg.chat.id, message);
    } catch (error) {
      console.error(`Error in handleListRepos for chat ${msg.chat.id}:`, error);
      await this.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
  }

  private isAdmin(userId?: number): boolean {
    return userId ? this.ADMIN_IDS.includes(userId) : false;
  }

  async sendMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error(`Failed to send message to chat ${chatId}:`, error);
      throw new Error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  async sendActionCompleteNotification(
    chatId: number,
    repository: string,
    branch: string,
    conclusion: string,
    actionName: string
  ): Promise<void> {
    try {
      const successEmoji = this.configService.get<string>(
        "TELEGRAM_SUCCESS_EMOJI",
        "✅"
      );
      const errorEmoji = this.configService.get<string>(
        "TELEGRAM_ERROR_EMOJI",
        "❌"
      );
      const messageTemplate = this.configService.get<string>(
        "TELEGRAM_MESSAGE_TEMPLATE",
        "{emoji} GitHub Action '{action}' completed {status}!\nRepository: {repository}\nBranch: {branch}"
      );

      const emoji = conclusion === "success" ? successEmoji : errorEmoji;
      const status = conclusion === "success" ? "successfully" : "with error";

      const message = messageTemplate
        .replace("{emoji}", emoji)
        .replace("{status}", status)
        .replace("{repository}", repository)
        .replace("{branch}", branch)
        .replace("{action}", actionName);

      await this.sendMessage(chatId, message);
      console.log(
        `Notification sent for ${repository} (${actionName}) to chat ${chatId}`
      );
    } catch (error) {
      console.error(
        `Failed to send action notification for ${repository}:`,
        error
      );
      throw error;
    }
  }
}
