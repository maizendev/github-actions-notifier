import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { TelegramService } from "../telegram/telegram.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private telegramService: TelegramService
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      async () => {
        try {
          await this.telegramService.getMe();
          return {
            telegram: {
              status: "up",
            },
          };
        } catch (error) {
          return {
            telegram: {
              status: "down",
              error: error.message,
            },
          };
        }
      },
    ]);
  }
}
