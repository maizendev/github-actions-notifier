import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository as TypeOrmRepository } from "typeorm";
import { Repository } from "../entities/repository.entity";
import { User } from "../entities/user.entity";
import * as crypto from "crypto";

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectRepository(Repository)
    private readonly repositoryRepository: TypeOrmRepository<Repository>
  ) {}

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createRepository(
    user: User,
    name: string,
    fullName: string,
    actions: string[] = []
  ): Promise<Repository> {
    const repository = this.repositoryRepository.create({
      name,
      fullName,
      actions,
      webhookSecret: this.generateWebhookSecret(),
      user,
    });

    return this.repositoryRepository.save(repository);
  }

  async findByUser(user: User): Promise<Repository[]> {
    return this.repositoryRepository.find({
      where: { user: { id: user.id } },
      relations: ["user"],
    });
  }

  async findByFullName(fullName: string): Promise<Repository[]> {
    return this.repositoryRepository.find({
      where: { fullName },
      relations: ["user"],
    });
  }

  async deleteRepository(id: number, userId: number): Promise<boolean> {
    const result = await this.repositoryRepository.delete({
      id,
      user: { id: userId },
    });
    return result.affected > 0;
  }

  async regenerateWebhookSecret(
    id: number,
    userId: number
  ): Promise<Repository | null> {
    const repository = await this.repositoryRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ["user"],
    });

    if (!repository) {
      return null;
    }

    repository.webhookSecret = this.generateWebhookSecret();
    return this.repositoryRepository.save(repository);
  }
}
