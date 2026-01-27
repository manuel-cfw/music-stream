import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_log')
@Index(['user'])
@Index(['action'])
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  action: string;

  @Column({ name: 'entity_type', nullable: true, length: 50 })
  entityType: string | null;

  @Column({ name: 'entity_id', nullable: true, type: 'char', length: 36 })
  entityId: string | null;

  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ name: 'ip_address', nullable: true, length: 45 })
  ipAddress: string | null;

  @Column({ name: 'user_agent', nullable: true, length: 500 })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;
}
