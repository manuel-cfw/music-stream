import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Provider } from './provider-account.entity';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Theme, default: Theme.SYSTEM })
  theme: Theme;

  @Column({ name: 'default_provider', type: 'enum', enum: Provider, nullable: true })
  defaultProvider: Provider | null;

  @Column({ name: 'auto_sync_enabled', default: false })
  autoSyncEnabled: boolean;

  @Column({ name: 'sync_interval_minutes', default: 60 })
  syncIntervalMinutes: number;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
