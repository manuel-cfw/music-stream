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

@Entity('refresh_tokens')
@Index(['user'])
@Index(['tokenHash'])
@Index(['expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_hash', length: 255 })
  tokenHash: string;

  @Column({ name: 'device_info', nullable: true, length: 500 })
  deviceInfo: string | null;

  @Column({ name: 'ip_address', nullable: true, length: 45 })
  ipAddress: string | null;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;
}
