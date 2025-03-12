import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { TelegramService } from "./telegram/telegram.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get("PORT", 3000);
  const APP_URL =
    configService.get("RENDER_EXTERNAL_URL") ||
    configService.get("APP_URL", "http://localhost:3000");

  app.enableCors();

  app.enableShutdownHooks();

  try {
    if (process.env.NODE_ENV === "production") {
      const telegramService = app.get(TelegramService);
      try {
        await telegramService.deleteWebhook();
        console.log("Cleaned up existing webhook configuration");
      } catch (error) {
        console.warn("Failed to cleanup existing webhook:", error.message);
      }
    }

    await app.init();

    if (process.env.NODE_ENV === "production") {
      const telegramService = app.get(TelegramService);
      let retries = 3;
      while (retries > 0) {
        try {
          await telegramService.setWebhook();
          console.log("Telegram webhook configured successfully");
          break;
        } catch (error) {
          if (error?.response?.error_code === 409) {
            console.log(
              "Detected conflicting bot instance, retrying after cleanup..."
            );
            await telegramService.deleteWebhook();
            retries--;
            continue;
          }
          if (
            error?.response?.error_code === 429 &&
            error?.response?.parameters?.retry_after
          ) {
            const retryAfter = error.response.parameters.retry_after * 1000;
            console.log(
              `Rate limited, waiting ${retryAfter}ms before retry...`
            );
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
            retries--;
          } else {
            throw error;
          }
        }
      }
    }

    await app.listen(port);
    console.log(`Application is running on: ${APP_URL}`);
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }

  const signals = ["SIGTERM", "SIGINT"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      try {
        if (process.env.NODE_ENV === "production") {
          const telegramService = app.get(TelegramService);
          await telegramService.deleteWebhook();
          console.log("Telegram webhook removed successfully");
        }
        await app.close();
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    });
  });
}
bootstrap();
