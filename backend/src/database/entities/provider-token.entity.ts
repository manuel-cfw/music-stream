import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ProviderAccount } from './provider-account.entity';

@Entity('provider_tokens')
export class ProviderToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text', nullable: true })
  refreshTokenEncrypted: string | null;

  @Column({ name: 'token_type', length: 50, default: 'Bearer' })
  tokenType: string;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'text', nullable: true })
  scope: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => ProviderAccount, (account) => account.token, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_account_id' })
  providerAccount: ProviderAccount;

  @Column({ name: 'provider_account_id' })
  providerAccountId: string;
}
