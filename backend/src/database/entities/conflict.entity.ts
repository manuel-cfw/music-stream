import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SyncRun } from './sync-run.entity';
import { UnifiedItem } from './unified-item.entity';

export enum ConflictType {
  TRACK_UNAVAILABLE = 'track_unavailable',
  TRACK_MODIFIED = 'track_modified',
  TRACK_REMOVED = 'track_removed',
  DUPLICATE_DETECTED = 'duplicate_detected',
  SYNC_FAILED = 'sync_failed',
}

export enum ConflictResolution {
  KEEP = 'keep',
  REMOVE = 'remove',
  REPLACE = 'replace',
  IGNORE = 'ignore',
}

@Entity('conflicts')
@Index(['syncRun'])
@Index(['resolved'])
export class Conflict {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conflict_type', type: 'enum', enum: ConflictType })
  conflictType: ConflictType;

  @Column({ type: 'json', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({
    type: 'enum',
    enum: ConflictResolution,
    nullable: true,
  })
  resolution: ConflictResolution | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SyncRun, (syncRun) => syncRun.conflicts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sync_run_id' })
  syncRun: SyncRun;

  @Column({ name: 'sync_run_id' })
  syncRunId: string;

  @ManyToOne(() => UnifiedItem, (item) => item.conflicts, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'unified_item_id' })
  unifiedItem: UnifiedItem | null;

  @Column({ name: 'unified_item_id', nullable: true })
  unifiedItemId: string | null;
}
