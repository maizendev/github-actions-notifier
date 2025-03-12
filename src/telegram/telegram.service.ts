import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Context } from "telegraf";
import { RepositoryConfigService } from "../config/repository-config.service";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly ADMIN_IDS: number[];

  constructor(
    private readonly configService: ConfigService,
    private readonly bot: Telegraf,
    private repositoryConfigService: RepositoryConfigService
  ) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");

    if (!token) {
      throw new Error("Telegram bot token is required");
    }

    this.ADMIN_IDS = JSON.parse(
      this.configService.get<string>("ADMIN_IDS", "[]")
    );
    console.log(`Configured admin IDs: ${this.ADMIN_IDS.join(", ")}`);

    this.setupCommands();
  }

  async onModuleInit() {
    try {
      const externalUrl = this.configService.get<string>("RENDER_EXTERNAL_URL");

      if (process.env.NODE_ENV === "production") {
        const webhookUrl = `${externalUrl}/telegram/webhook`;
        await this.setWebhook(webhookUrl);
        console.log(`Telegram webhook set to: ${webhookUrl}`);
      } else {
        await this.bot.launch({
          dropPendingUpdates: true,
        });
        console.log("Telegram bot started in polling mode");
      }

      await this.setupCommands();
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    try {
      console.log("Stopping Telegram bot...");
      await this.bot.stop();
      console.log("Telegram bot stopped successfully");
    } catch (e) {
      console.error("Error stopping Telegram bot:", e);
    }
  }

  private setupCommands() {
    try {
      this.bot.command("start", (ctx) => this.handleStart(ctx));
      this.bot.command("watch", (ctx) => {
        const args = ctx.message.text.split(" ").slice(1);
        if (args.length > 0) {
          this.handleWatchRepo(ctx, args[0]);
        } else {
          ctx.reply("Please specify repository name: /watch owner/repo");
        }
      });

      this.bot.command("unwatch", (ctx) => {
        const args = ctx.message.text.split(" ").slice(1);
        if (args.length > 0) {
          this.handleUnwatchRepo(ctx, args[0]);
        } else {
          ctx.reply("Please specify repository name: /unwatch owner/repo");
        }
      });

      this.bot.command("list", (ctx) => this.handleListRepos(ctx));

      console.log("Telegram bot commands successfully configured");
    } catch (error) {
      console.error("Failed to setup bot commands:", error);
      throw error;
    }
  }

  private async handleStart(ctx: Context) {
    const chatId = ctx.chat.id;
    const isAdmin = this.ADMIN_IDS.includes(ctx.from?.id || 0);

    let message = "Hello! I'm a bot for GitHub Actions notifications.\n\n";
    if (isAdmin) {
      message += "Available commands:\n";
      message += "/watch owner/repo - Start watching a repository\n";
      message += "/unwatch owner/repo - Stop watching a repository\n";
      message += "/list - Show list of watched repositories";
    }

    await ctx.reply(message);
  }

  private async handleWatchRepo(ctx: Context, repoName: string) {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;

    try {
      if (!this.isAdmin(userId)) {
        await ctx.reply("You don't have permission to execute this command.");
        console.warn(
          `Unauthorized watch attempt by user ${userId} in chat ${chatId}`
        );
        return;
      }

      if (!this.isValidRepoName(repoName)) {
        await ctx.reply(
          "❌ Invalid repository name format. Use format: owner/repository"
        );
        return;
      }

      const exists = await this.repositoryConfigService.repositoryExists(
        repoName,
        chatId.toString()
      );
      if (exists) {
        await ctx.reply(
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

      await ctx.reply(
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
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }

  private isValidRepoName(repoName: string): boolean {
    return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoName);
  }

  private async handleUnwatchRepo(ctx: Context, repoName: string) {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;

    try {
      if (!this.isAdmin(userId)) {
        await ctx.reply("You don't have permission to execute this command.");
        console.warn(
          `Unauthorized unwatch attempt by user ${userId} in chat ${chatId}`
        );
        return;
      }

      if (!this.isValidRepoName(repoName)) {
        await ctx.reply(
          "❌ Invalid repository name format. Use format: owner/repository"
        );
        return;
      }

      const exists = await this.repositoryConfigService.repositoryExists(
        repoName,
        chatId.toString()
      );
      if (!exists) {
        await ctx.reply("❌ This repository is not being watched in this chat");
        return;
      }

      await this.repositoryConfigService.removeRepository(
        repoName,
        chatId.toString()
      );

      console.log(`Repository ${repoName} unwatched in chat ${chatId}`);
      await ctx.reply(`✅ Repository ${repoName} is no longer being watched!`);
    } catch (error) {
      console.error(`Error in handleUnwatchRepo for chat ${chatId}:`, error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }

  private async handleListRepos(ctx: Context) {
    if (!this.isAdmin(ctx.from?.id)) {
      await ctx.reply("You don't have permission to execute this command.");
      return;
    }

    try {
      const repositories =
        await this.repositoryConfigService.getRepositoriesForChat(
          ctx.chat.id.toString()
        );

      if (repositories.length === 0) {
        await ctx.reply("No repositories are being watched.");
        return;
      }

      const message = repositories
        .map(
          (repo) =>
            `📦 ${repo.name}\n   Chat: ${repo.chatId}\n   Actions: ${repo.actions?.join(", ") || "all"}\n   Added: ${repo.addedAt}`
        )
        .join("\n\n");

      await ctx.reply(message);
    } catch (error) {
      console.error(`Error in handleListRepos for chat ${ctx.chat.id}:`, error);
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  }

  private isAdmin(userId?: number): boolean {
    return userId ? this.ADMIN_IDS.includes(userId) : false;
  }

  async sendMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message);
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

  async setWebhook(webhookUrl: string) {
    try {
      await this.bot.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: true,
      });
    } catch (error) {
      console.error("Failed to set webhook:", error);
      throw error;
    }
  }

  async deleteWebhook() {
    try {
      await this.bot.telegram.deleteWebhook({ drop_pending_updates: true });
    } catch (error) {
      console.error("Failed to delete webhook:", error);
      throw error;
    }
  }

  async handleUpdate(update: any) {
    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      console.error("Error handling update:", error);
    }
  }
}
