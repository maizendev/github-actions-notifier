import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get("PORT", 3000);
  const APP_URL = configService.get("APP_URL", "http://localhost:3000");

  // Graceful shutdown
  app.enableShutdownHooks();
  
  await app.listen(port);
  console.log(`