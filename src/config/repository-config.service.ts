import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RepositoryConfig } from "./interfaces/repository.interface";

@Injectable()
export class RepositoryConfigService {
  constructor(private readonly configService: ConfigService) {}

  private getRepositories(): RepositoryConfig[] {
    try {
      const reposConfig = process.env.REPOSITORIES_CONFIG;
      if (!reposConfig) {
        return [];
      }
      return JSON.parse(reposConfig);
    } catch (error) {
      console.error("Error parsing REPOSITORIES_CONFIG:", error);
      return [];
    }
  }

  async getAllRepositories(): Promise<RepositoryConfig[]> {
    return this.getRepositories();
  }

  async getRepositoriesForChat(chatId: string): Promise<RepositoryConfig[]> {
    const repositories = this.getRepositories();
    return repositories.filter((repo) => repo.chatId.toString() === chatId);
  }

  async repositoryExists(repoName: string, chatId: string): Promise<boolean> {
    const repositories = this.getRepositories();
    return repositories.some(
      (repo) =>
        repo.name.toLowerCase() === repoName.toLowerCase() &&
        repo.chatId.toString() === chatId
    );
  }

  async addRepository(
    repo: Omit<RepositoryConfig, "addedAt"> & { addedAt: string }
  ): Promise<void> {
    const repositories = this.getRepositories();

    const exists = repositories.some(
      (r) =>
        r.name.toLowerCase() === repo.name.toLowerCase() &&
        r.chatId === repo.chatId
    );
    if (exists) {
      throw new Error("Repository already exists for this chat");
    }

    const webhookSecret = this.configService.get<string>(
      "GITHUB_WEBHOOK_SECRET"
    );

    repositories.push({
      ...repo,
      name: repo.name.toLowerCase(),
      actions: repo.actions || [],
      addedAt: new Date().toISOString(),
      webhookSecret,
    });

    process.env.REPOSITORIES_CONFIG = JSON.stringify(repositories);
  }

  async removeRepository(repoName: string, chatId: string): Promise<void> {
    const repositories = this.getRepositories();
    const filteredRepos = repositories.filter(
      (repo) =>
        !(
          repo.name.toLowerCase() === repoName.toLowerCase() &&
          repo.chatId.toString() === chatId
        )
    );

    if (repositories.length === filteredRepos.length) {
      throw new Error("Repository not found");
    }

    process.env.REPOSITORIES_CONFIG = JSON.stringify(filteredRepos);
  }

  async getWebhookSecret(repoName: string): Promise<string> {
    const webhookSecret = this.configService.get<string>(
      "GITHUB_WEBHOOK_SECRET"
    );
    if (!webhookSecret) {
      throw new Error("Webhook secret not found");
    }
    return webhookSecret;
  }
}
