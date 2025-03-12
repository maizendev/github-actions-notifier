import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { RepositoryConfigService } from "./repository-config.service";

@Module({
  imports: [ConfigModule],
  providers: [RepositoryConfigService],
  exports: [RepositoryConfigService],
})
export class RepositoryConfigModule {}
