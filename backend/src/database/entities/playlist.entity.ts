import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { ProviderAccount } from './provider-account.entity';
import { PlaylistItem } from './playlist-item.entity';

@Entity('playlists')
@Unique(['providerAccount', 'providerPlaylistId'])
@Index(['name'])
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_playlist_id', length: 255 })
  providerPlaylistId: string;

  @Column({ length: 500 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true, length: 500 })
  imageUrl: string | null;

  @Column({ name: 'track_count', default: 0 })
  trackCount: number;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  @Column({ name: 'is_owner', default: true })
  isOwner: boolean;

  @Column({ name: 'snapshot_id', type: 'varchar', nullable: true, length: 255 })
  snapshotId: string | null;

  @Column({ name: 'last_synced_at', type: 'datetime', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProviderAccount, (account) => account.playlists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_account_id' })
  providerAccount: ProviderAccount;

  @Column({ name: 'provider_account_id' })
  providerAccountId: string;

  @OneToMany(() => PlaylistItem, (item) => item.playlist)
  items: PlaylistItem[];
}
