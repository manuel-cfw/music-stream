import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ProviderToken } from './provider-token.entity';
import { Playlist } from './playlist.entity';

export enum Provider {
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
}

@Entity('provider_accounts')
@Unique(['user', 'provider'])
@Index(['provider', 'providerUserId'])
export class ProviderAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Provider })
  provider: Provider;

  @Column({ name: 'provider_user_id', length: 255 })
  providerUserId: string;

  @Column({ name: 'display_name', nullable: true, length: 255 })
  displayName: string | null;

  @Column({ nullable: true, length: 255 })
  email: string | null;

  @Column({ name: 'profile_url', nullable: true, length: 500 })
  profileUrl: string | null;

  @Column({ name: 'image_url', nullable: true, length: 500 })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.providerAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => ProviderToken, (token) => token.providerAccount, { cascade: true })
  token: ProviderToken;

  @OneToMany(() => Playlist, (playlist) => playlist.providerAccount)
  playlists: Playlist[];
}
