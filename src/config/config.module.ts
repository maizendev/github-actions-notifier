import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigService } from "./config.service";
import { RepositoryConfigService } from "./repository-config.service";

@Module({
  imports: [ConfigModule],
  providers: [AppConfigService, RepositoryConfigService],
  exports: [AppConfigService, RepositoryConfigService],
})
export class AppConfigModule {}
