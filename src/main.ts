import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get("PORT", 3000);
  const APP_URL = configService.get("APP_URL", "http://localhost:3000");

  app.enableCors();

  app.enableShutdownHooks();

  try {
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
      await app.close();
      process.exit(0);
    });
  });
}
bootstrap();
