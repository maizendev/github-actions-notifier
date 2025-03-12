import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

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
    await app.init();

    if (process.env.NODE_ENV === "production") {
      const telegramService = app.get("TelegramService");
      await telegramService.setWebhook(`${APP_URL}/telegram/webhook`);
      console.log("Telegram webhook configured successfully");
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
          const telegramService = app.get("TelegramService");
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
