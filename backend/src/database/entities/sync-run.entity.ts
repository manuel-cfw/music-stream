import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ProviderAccount } from './provider-account.entity';
import { Conflict } from './conflict.entity';
import { SyncType, SyncStatus } from './enums';

@Entity('sync_runs')
@Index(['user'])
@Index(['status'])
@Index(['createdAt'])
export class SyncRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sync_type', type: 'enum', enum: SyncType })
  syncType: SyncType;

  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.PENDING })
  status: SyncStatus;

  @Column({ name: 'items_processed', default: 0 })
  itemsProcessed: number;

  @Column({ name: 'items_added', default: 0 })
  itemsAdded: number;

  @Column({ name: 'items_updated', default: 0 })
  itemsUpdated: number;

  @Column({ name: 'items_removed', default: 0 })
  itemsRemoved: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.syncRuns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => ProviderAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'provider_account_id' })
  providerAccount: ProviderAccount | null;

  @Column({ name: 'provider_account_id', nullable: true })
  providerAccountId: string | null;

  @OneToMany(() => Conflict, (conflict) => conflict.syncRun)
  conflicts: Conflict[];
}
