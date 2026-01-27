import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ProviderAccount } from './provider-account.entity';
import { UnifiedPlaylist } from './unified-playlist.entity';
import { SyncRun } from './sync-run.entity';
import { RefreshToken } from './refresh-token.entity';
import { UserSettings } from './user-settings.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', nullable: true, length: 255 })
  passwordHash: string | null;

  @Column({ name: 'display_name', nullable: true, length: 100 })
  displayName: string | null;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'magic_link_token', nullable: true, length: 255 })
  magicLinkToken: string | null;

  @Column({ name: 'magic_link_expires_at', nullable: true, type: 'datetime' })
  magicLinkExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProviderAccount, (account) => account.user)
  providerAccounts: ProviderAccount[];

  @OneToMany(() => UnifiedPlaylist, (playlist) => playlist.user)
  unifiedPlaylists: UnifiedPlaylist[];

  @OneToMany(() => SyncRun, (syncRun) => syncRun.user)
  syncRuns: SyncRun[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings: UserSettings;
}
