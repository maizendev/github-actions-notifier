import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RepositoryConfig } from "./interfaces/repository.interface";

@Injectable()
export class RepositoryConfigService {
  constructor(private readonly configService: ConfigService) {
    console.log("Initializing RepositoryConfigService...");
  }

  private getRepositories(): RepositoryConfig[] {
    try {
      const repositories =
        this.configService.get<RepositoryConfig[]>("repositories");
      if (!repositories) {
        console.log("No repositories found in config");
        return [];
      }
      return repositories;
    } catch (error) {
      console.error("Error getting repositories:", error);
      return [];
    }
  }

  async addRepository(
    repo: Omit<RepositoryConfig, "addedAt"> & { addedAt: string }
  ): Promise<void> {
    const repositories = this.getRepositories();

    const exists = repositories.some(
      (r) => r.name === repo.name && r.chatId === repo.chatId
    );
    if (exists) {
      throw new Error("Repository already exists for this chat");
    }

    const webhookSecret = this.configService.get<string>(
      "github.webhookSecret"
    );

    repositories.push({
      ...repo,
      actions: repo.actions || [],
      addedAt: new Date().toISOString(),
      webhookSecret,
    });

    // Обновляем конфигурацию
    process.env.REPOSITORIES_CONFIG = JSON.stringify(repositories);
  }

  async removeRepository(repoName: string, chatId: string): Promise<void> {
    const repositories = this.getRepositories();
    const filteredRepos = repositories.filter(
      (repo) => !(repo.name === repoName && repo.chatId === Number(chatId))
    );

    if (filteredRepos.length === repositories.length) {
      throw new Error("Repository not found");
    }

    // Обновляем конфигурацию
    process.env.REPOSITORIES_CONFIG = JSON.stringify(filteredRepos);
  }

  async getRepositoriesForChat(chatId: string): Promise<RepositoryConfig[]> {
    const repositories = this.getRepositories();
    return repositories.filter((repo) => repo.chatId === Number(chatId));
  }

  async repositoryExists(repoName: string, chatId: string): Promise<boolean> {
    const repositories = this.getRepositories();
    return repositories.some(
      (repo) => repo.name === repoName && repo.chatId === Number(chatId)
    );
  }

  async getAllRepositories(): Promise<RepositoryConfig[]> {
    return this.getRepositories();
  }

  async getWebhookSecret(repoName: string): Promise<string> {
    const webhookSecret = this.configService.get<string>(
      "github.webhookSecret"
    );
    if (!webhookSecret) {
      throw new Error("Webhook secret not found");
    }
    return webhookSecret;
  }
}
