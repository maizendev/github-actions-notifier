import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "../entities/user.entity";
import * as crypto from "crypto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findByTelegramId(telegramId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  async createUser(telegramId: string, username?: string): Promise<User> {
    const user = this.userRepository.create({
      telegramId,
      username,
      role: UserRole.USER,
    });
    return this.userRepository.save(user);
  }

  async updateUserRole(telegramId: string, role: UserRole): Promise<void> {
    await this.userRepository.update({ telegramId }, { role });
  }

  async findOrCreate(telegramId: string, username?: string): Promise<User> {
    let user = await this.findByTelegramId(telegramId);
    if (!user) {
      user = await this.createUser(telegramId, username);
    }
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
}
