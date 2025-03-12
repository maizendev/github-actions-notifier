import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RepositoryConfig } from "./interfaces/repository.interface";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AppConfigService {
  private readonly configPath: string;

  constructor(private configService: ConfigService) {
    this.configPath = path.join(process.cwd(), ".env");
  }

  getRepositories(): RepositoryConfig[] {
    return this.configService.get<RepositoryConfig[]>("repositories") || [];
  }

  async addRepository(repo: RepositoryConfig): Promise<void> {
    const repositories = this.getRepositories();

    if (repositories.some((r) => r.name === repo.name)) {
      throw new Error("Repository already exists");
    }

    repositories.push({
      ...repo,
      addedAt: new Date().toISOString(),
    });

    await this.updateRepositoriesConfig(repositories);
  }

  async removeRepository(repoName: string): Promise<void> {
    const repositories = this.getRepositories();
    const filteredRepos = repositories.filter((repo) => repo.name !== repoName);

    if (filteredRepos.length === repositories.length) {
      throw new Error("Repository not found");
    }

    await this.updateRepositoriesConfig(filteredRepos);
  }

  async updateRepository(
    repoName: string,
    updates: Partial<RepositoryConfig>
  ): Promise<void> {
    const repositories = this.getRepositories();
    const repoIndex = repositories.findIndex((repo) => repo.name === repoName);

    if (repoIndex === -1) {
      throw new Error("Repository not found");
    }

    repositories[repoIndex] = {
      ...repositories[repoIndex],
      ...updates,
    };

    await this.updateRepositoriesConfig(repositories);
  }

  private async updateRepositoriesConfig(
    repositories: RepositoryConfig[]
  ): Promise<void> {
    let envContent = await fs.promises.readFile(this.configPath, "utf8");

    const repoConfigLine = `REPOSITORIES_CONFIG=${JSON.stringify(repositories, null, 2)}`;
    const repoConfigRegex = /REPOSITORIES_CONFIG=.*/;

    if (repoConfigRegex.test(envContent)) {
      envContent = envContent.replace(repoConfigRegex, repoConfigLine);
    } else {
      envContent += `\n${repoConfigLine}`;
    }

    await fs.promises.writeFile(this.configPath, envContent);
  }
}
