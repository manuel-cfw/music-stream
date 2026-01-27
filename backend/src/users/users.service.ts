import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserSettings } from '../database/entities';

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  displayName: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = this.userRepository.create({
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    });

    const savedUser = await this.userRepository.save(user);

    // Create default settings
    const settings = this.settingsRepository.create({
      userId: savedUser.id,
    });
    await this.settingsRepository.save(settings);

    return savedUser;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updates);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const settings = await this.settingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      // Create default settings if not exist
      const newSettings = this.settingsRepository.create({ userId });
      return this.settingsRepository.save(newSettings);
    }

    return settings;
  }

  async updateSettings(
    userId: string,
    updates: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const settings = await this.getSettings(userId);
    await this.settingsRepository.update(settings.id, updates);
    return this.getSettings(userId);
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'providerAccounts',
        'unifiedPlaylists',
        'unifiedPlaylists.items',
        'syncRuns',
        'settings',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      providerAccounts: user.providerAccounts?.map((pa) => ({
        provider: pa.provider,
        displayName: pa.displayName,
        connectedAt: pa.createdAt,
      })),
      unifiedPlaylists: user.unifiedPlaylists?.map((up) => ({
        name: up.name,
        description: up.description,
        itemCount: up.items?.length || 0,
        createdAt: up.createdAt,
      })),
      settings: user.settings,
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteUserWithAllData(userId: string): Promise<void> {
    // TypeORM will cascade delete related entities
    await this.delete(userId);
  }
}
