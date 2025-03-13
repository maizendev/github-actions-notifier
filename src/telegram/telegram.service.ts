import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Telegraf, Context } from "telegraf";
import { RepositoryConfigService } from "../config/repository-config.service";
import { UsersService } from "../users/users.service";
import { UserRole } from "../entities/user.entity";

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly OWNER_ID: number;
  private readonly ADMIN_IDS: number[];
  private readonly bot: Telegraf;

  constructor(
    private readonly configService: ConfigService,
    private readonly repositoryConfigService: RepositoryConfigService,
    private readonly usersService: UsersService
  ) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be provided");
    }

    this.OWNER_ID = parseInt(
      this.configService.get<string>("OWNER") || "505866066",
      10
    );

    const adminIds = this.configService.get<string>("ADMIN_IDS");
    try {
      this.ADMIN_IDS = JSON.parse(adminIds);
      console.log("Configured admin IDs:", this.ADMIN_IDS.join(", "));
    } catch (error) {
      console.error("Failed to parse ADMIN_IDS:", error);
      this.ADMIN_IDS = [];
    }

    this.bot = new Telegraf(token);
  }

  async onModuleInit() {
    try {
      if (process.env.NODE_ENV === "production") {
        await this.setWebhook();
        const webhookUrl = `${this.configService.get("APP_URL")}/telegram/webhook`;
        console.log(`Telegram webhook set to: ${webhookUrl}`);
      } else {
        await this.deleteWebhook();
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
      if (process.env.NODE_ENV === "production") {
        await this.deleteWebhook();
      } else {
        await this.bot.stop();
      }
      console.log("Telegram bot stopped successfully");
    } catch (e) {
      if (e.message !== "Bot is not running!") {
        console.error("Error stopping Telegram bot:", e);
      }
    }
  }

  private async getUserRole(userId: number): Promise<UserRole> {
    if (userId === this.OWNER_ID) {
      return UserRole.OWNER;
    }
    if (this.ADMIN_IDS.includes(userId)) {
      return UserRole.ADMIN;
    }
    return UserRole.USER;
  }

  private async checkPermission(
    userId: number,
    requiredRole: UserRole
  ): Promise<boolean> {
    const userRole = await this.getUserRole(userId);

    switch (requiredRole) {
      case UserRole.OWNER:
        return userRole === UserRole.OWNER;
      case UserRole.ADMIN:
        return userRole === UserRole.OWNER || userRole === UserRole.ADMIN;
      case UserRole.USER:
        return true;
      default:
        return false;
    }
  }

  private setupCommands() {
    try {
      this.bot.command("start", (ctx) => this.handleStart(ctx));

      // Owner commands
      this.bot.command("addadmin", async (ctx) => {
        if ("text" in ctx.message) {
          await this.handleAddAdmin(ctx);
        }
      });

      this.bot.command("removeadmin", async (ctx) => {
        if ("text" in ctx.message) {
          await this.handleRemoveAdmin(ctx);
        }
      });

      // Admin commands
      this.bot.command("add", async (ctx) => {
        if ("text" in ctx.message) {
          const args = ctx.message.text.split(" ").slice(1);
          if (args.length > 0) {
            await this.handleWatchRepo(ctx, args[0]);
          } else {
            await ctx.reply("Please specify repository name: /add owner/repo");
          }
        }
      });

      this.bot.command("remove", async (ctx) => {
        if ("text" in ctx.message) {
          const args = ctx.message.text.split(" ").slice(1);
          if (args.length > 0) {
            await this.handleUnwatchRepo(ctx, args[0]);
          } else {
            await ctx.reply(
              "Please specify repository name: /remove owner/repo"
            );
          }
        }
      });

      this.bot.command("list", (ctx) => this.handleListRepos(ctx));

      console.log("Telegram bot commands successfully configured");
    } catch (error) {
      console.error("Failed to setup bot commands:", error);
      throw error;
    }
  }

  private async handleAddAdmin(ctx: Context) {
    const userId = ctx.from?.id;
    if (!(await this.checkPermission(userId, UserRole.OWNER))) {
      await ctx.reply("❌ Only the owner can add administrators");
      return;
    }

    if (!("text" in ctx.message)) {
      await ctx.reply("❌ Invalid command format");
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    if (args.length === 0) {
      await ctx.reply("Please specify Telegram ID: /addadmin <telegram_id>");
      return;
    }

    const newAdminId = args[0];
    try {
      await this.usersService.updateUserRole(newAdminId, UserRole.ADMIN);
      await ctx.reply(`✅ User ${newAdminId} has been added as administrator`);
    } catch (error) {
      await ctx.reply(`❌ Failed to add administrator: ${error.message}`);
    }
  }

  private async handleRemoveAdmin(ctx: Context) {
    const userId = ctx.from?.id;
    if (!(await this.checkPermission(userId, UserRole.OWNER))) {
      await ctx.reply("❌ Only the owner can remove administrators");
      return;
    }

    if (!("text" in ctx.message)) {
      await ctx.reply("❌ Invalid command format");
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    if (args.length === 0) {
      await ctx.reply("Please specify Telegram ID: /removeadmin <telegram_id>");
      return;
    }

    const adminId = args[0];
    try {
      await this.usersService.updateUserRole(adminId, UserRole.USER);
      await ctx.reply(`✅ Administrator ${adminId} has been removed`);
    } catch (error) {
      await ctx.reply(`❌ Failed to remove administrator: ${error.message}`);
    }
  }

  private async handleStart(ctx: Context) {
    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    const userRole = await this.getUserRole(userId);

    let message = "Hello! I'm a bot for GitHub Actions notifications.\n\n";
    message += "Available commands:\n";

    if (userRole === UserRole.OWNER) {
      message += "👑 Owner commands:\n";
      message += "/addadmin <telegram_id> - Add a new administrator\n";
      message += "/removeadmin <telegram_id> - Remove an administrator\n\n";
    }

    if (userRole === UserRole.OWNER || userRole === UserRole.ADMIN) {
      message += "⚙️ Admin commands:\n";
      message += "/add owner/repo - Start watching a repository\n";
      message += "/remove owner/repo - Stop watching a repository\n";
      message += "/list - Show list of watched repositories\n";
    }

    message += "\nℹ️ General commands:\n";
    message += "/start - Show this help message";

    await ctx.reply(message);
  }

  private async handleWatchRepo(ctx: Context, repoName: string) {
    const userId = ctx.from?.id;
    if (!(await this.checkPermission(userId, UserRole.ADMIN))) {
      await ctx.reply("❌ Only administrators can watch repositories");
      return;
    }

    const chatId = ctx.chat.id;

    try {
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
        chatId: chatId,
        actions: [],
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
    const userId = ctx.from?.id;
    if (!(await this.checkPermission(userId, UserRole.ADMIN))) {
      await ctx.reply("❌ Only administrators can unwatch repositories");
      return;
    }

    const chatId = ctx.chat.id;

    try {
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
    const userId = ctx.from?.id;
    if (!(await this.checkPermission(userId, UserRole.ADMIN))) {
      await ctx.reply("❌ Only administrators can list repositories");
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

  async sendMessage(chatId: number, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      console.error(`Failed to send message to chat ${chatId}:`, error);
      throw new Error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  async sendActionStartNotification(
    chatId: number,
    repository: string,
    branch: string,
    actionName: string
  ): Promise<void> {
    try {
      const message = `🚀 GitHub Action '${actionName}' запущен!\nRepository: ${repository}\nBranch: ${branch}`;
      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error(
        `Failed to send start notification for ${repository}:`,
        error
      );
      throw error;
    }
  }

  async sendActionCompleteNotification(
    chatId: number,
    repository: string,
    branch: string,
    conclusion: string,
    actionName: string,
    executionTimeSeconds?: number
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
        "{emoji} GitHub Action '{action}' завершен {status}!\nRepository: {repository}\nBranch: {branch}"
      );

      const emoji = conclusion === "success" ? successEmoji : errorEmoji;
      const status = conclusion === "success" ? "успешно" : "с ошибкой";

      let message = messageTemplate
        .replace("{emoji}", emoji)
        .replace("{status}", status)
        .replace("{repository}", repository)
        .replace("{branch}", branch)
        .replace("{action}", actionName);

      if (executionTimeSeconds !== undefined) {
        const minutes = Math.floor(executionTimeSeconds / 60);
        const seconds = executionTimeSeconds % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        message += `\nВремя выполнения: ${timeStr}`;
      }

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error(
        `Failed to send completion notification for ${repository}:`,
        error
      );
      throw error;
    }
  }

  async setWebhook() {
    const webhookUrl = `${this.configService.get("APP_URL")}/telegram/webhook`;
    return this.bot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: true,
    });
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

  async getMe(): Promise<any> {
    return this.bot.telegram.getMe();
  }
}
