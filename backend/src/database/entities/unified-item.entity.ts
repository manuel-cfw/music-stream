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
import { UnifiedPlaylist } from './unified-playlist.entity';
import { Track } from './track.entity';
import { Conflict } from './conflict.entity';

@Entity('unified_items')
@Unique(['unifiedPlaylist', 'position'])
@Index(['track'])
export class UnifiedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  position: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'added_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  addedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UnifiedPlaylist, (playlist) => playlist.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unified_playlist_id' })
  unifiedPlaylist: UnifiedPlaylist;

  @Column({ name: 'unified_playlist_id' })
  unifiedPlaylistId: string;

  @ManyToOne(() => Track, (track) => track.unifiedItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column({ name: 'track_id' })
  trackId: string;

  @OneToMany(() => Conflict, (conflict) => conflict.unifiedItem)
  conflicts: Conflict[];
}
