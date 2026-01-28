import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  OneToMany,
} from 'typeorm';
import { Provider } from './enums';
import { PlaylistItem } from './playlist-item.entity';
import { UnifiedItem } from './unified-item.entity';

@Entity('tracks')
@Unique(['provider', 'providerTrackId'])
@Index(['name'])
@Index(['artist'])
@Index(['isrc'])
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Provider })
  provider: Provider;

  @Column({ name: 'provider_track_id', length: 255 })
  providerTrackId: string;

  @Column({ length: 500 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  artist: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  album: string | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  isrc: string | null;

  @Column({ name: 'preview_url', type: 'varchar', nullable: true, length: 500 })
  previewUrl: string | null;

  @Column({ name: 'external_url', type: 'varchar', nullable: true, length: 500 })
  externalUrl: string | null;

  @Column({ name: 'image_url', type: 'varchar', nullable: true, length: 500 })
  imageUrl: string | null;

  @Column({ name: 'is_playable', default: true })
  isPlayable: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PlaylistItem, (item) => item.track)
  playlistItems: PlaylistItem[];

  @OneToMany(() => UnifiedItem, (item) => item.track)
  unifiedItems: UnifiedItem[];
}
