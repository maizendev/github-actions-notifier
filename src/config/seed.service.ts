import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository as TypeOrmRepository } from "typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "../entities/repository.entity";

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: TypeOrmRepository<User>,
    @InjectRepository(Repository)
    private repositoryRepository: TypeOrmRepository<Repository>
  ) {}

  async onModuleInit() {
    await this.seedUsers();
    await this.seedRepositories();
  }

  private async seedUsers() {
    const adminIds = JSON.parse(this.configService.get("ADMIN_IDS") || "[]");

    for (const adminId of adminIds) {
      const existingUser = await this.userRepository.findOne({
        where: { telegramId: adminId.toString() },
      });

      if (!existingUser) {
        await this.userRepository.save({
          telegramId: adminId.toString(),
          isAdmin: true,
        });
      }
    }
  }

  private async seedRepositories() {
    const reposConfig = JSON.parse(
      this.configService.get("REPOSITORIES_CONFIG") || "[]"
    );

    for (const repo of reposConfig) {
      // First find or create the user
      let user = await this.userRepository.findOne({
        where: { telegramId: repo.chatId.toString() },
      });

      if (!user) {
        user = await this.userRepository.save({
          telegramId: repo.chatId.toString(),
          isAdmin: false,
        });
      }

      // Then check if repository exists for this user
      const existingRepo = await this.repositoryRepository.findOne({
        where: {
          fullName: repo.repository,
          user: { id: user.id },
        },
      });

      if (!existingRepo) {
        await this.repositoryRepository.save({
          name: repo.name,
          fullName: repo.repository,
          actions: repo.actions || [],
          webhookSecret: repo.webhookSecret,
          user: user,
        });
      }
    }
  }
}
