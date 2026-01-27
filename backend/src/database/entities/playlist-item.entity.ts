import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { Track } from './track.entity';

@Entity('playlist_items')
@Unique(['playlist', 'position'])
@Index(['track'])
export class PlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  position: number;

  @Column({ name: 'added_at', type: 'datetime', nullable: true })
  addedAt: Date | null;

  @Column({ name: 'added_by', nullable: true, length: 255 })
  addedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Playlist, (playlist) => playlist.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlist_id' })
  playlist: Playlist;

  @Column({ name: 'playlist_id' })
  playlistId: string;

  @ManyToOne(() => Track, (track) => track.playlistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column({ name: 'track_id' })
  trackId: string;
}
