import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { RepositoryConfig } from "./interfaces/repository.interface";

@Injectable()
export class RepositoryConfigService {
  private readonly WEBHOOK_SECRETS_KEY = "WEBHOOK_SECRETS";
  private readonly REPOSITORIES_KEY = "REPOSITORIES_CONFIG";

  constructor(private readonly configService: ConfigService) {
    if (!this.configService.get<string>(this.REPOSITORIES_KEY)) {
      this.configService.set(this.REPOSITORIES_KEY, "[]");
    }
    if (!this.configService.get<string>(this.WEBHOOK_SECRETS_KEY)) {
      this.configService.set(this.WEBHOOK_SECRETS_KEY, "{}");
    }
  }

  private getRepositories(): RepositoryConfig[] {
    const reposJson = this.configService.get<string>(
      this.REPOSITORIES_KEY,
      "[]"
    );
    return JSON.parse(reposJson);
  }

  private saveRepositories(repositories: RepositoryConfig[]): void {
    this.configService.set(this.REPOSITORIES_KEY, JSON.stringify(repositories));
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

    repositories.push({
      ...repo,
      actions: repo.actions || [],
      addedAt: new Date().toISOString(),
    });

    this.saveRepositories(repositories);

    const secret = crypto.randomBytes(32).toString("hex");
    const secrets = JSON.parse(
      this.configService.get<string>(this.WEBHOOK_SECRETS_KEY, "{}")
    );
    secrets[repo.name] = secret;
    this.configService.set(this.WEBHOOK_SECRETS_KEY, JSON.stringify(secrets));
  }

  async removeRepository(repoName: string, chatId: string): Promise<void> {
    const repositories = this.getRepositories();

    const filteredRepos = repositories.filter(
      (repo) => !(repo.name === repoName && repo.chatId === chatId)
    );

    if (filteredRepos.length === repositories.length) {
      throw new Error("Repository not found");
    }

    this.saveRepositories(filteredRepos);

    const repoStillExists = filteredRepos.some(
      (repo) => repo.name === repoName
    );
    if (!repoStillExists) {
      const secrets = JSON.parse(
        this.configService.get<string>(this.WEBHOOK_SECRETS_KEY, "{}")
      );
      delete secrets[repoName];
      this.configService.set(this.WEBHOOK_SECRETS_KEY, JSON.stringify(secrets));
    }
  }

  async getRepositoriesForChat(chatId: string): Promise<RepositoryConfig[]> {
    const repositories = this.getRepositories();
    return repositories.filter((repo) => repo.chatId === chatId);
  }

  async repositoryExists(repoName: string, chatId: string): Promise<boolean> {
    const repositories = this.getRepositories();
    return repositories.some(
      (repo) => repo.name === repoName && repo.chatId === chatId
    );
  }

  async getWebhookSecret(repoName: string): Promise<string> {
    const secrets = JSON.parse(
      this.configService.get<string>(this.WEBHOOK_SECRETS_KEY, "{}")
    );

    const secret = secrets[repoName];
    if (!secret) {
      throw new Error("Webhook secret not found for repository");
    }

    return secret;
  }
}
