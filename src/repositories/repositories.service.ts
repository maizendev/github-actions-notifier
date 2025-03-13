import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository as TypeOrmRepository } from "typeorm";
import { Repository } from "../entities/repository.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class RepositoriesService {
  constructor(
    @InjectRepository(Repository)
    private readonly repositoryRepository: TypeOrmRepository<Repository>
  ) {}

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
}
