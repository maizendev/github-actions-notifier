import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { catchError, firstValueFrom } from "rxjs";

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly appUrl: string;
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.appUrl = this.configService.get<string>("APP_URL");
  }

  async onModuleInit() {
    // Initial delay of 1 minute to allow the application to fully start
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Ping every 3 minutes
    this.interval = setInterval(() => this.ping(), 3 * 60 * 1000);

    // Initial ping
    await this.ping();
  }

  private async ping() {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.appUrl}/health`).pipe(
          catchError((error) => {
            console.error("Health check failed:", error.message);
            throw error;
          })
        )
      );
      console.log("Keep-alive ping successful:", data.status);
    } catch (error) {
      console.error("Keep-alive ping failed:", error.message);
    }
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
