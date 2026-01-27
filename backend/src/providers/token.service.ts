import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProviderToken, Provider } from '../database/entities';
import { encrypt, decrypt } from '../common/utils';
import { SpotifyAdapter } from './adapters/spotify.adapter';
import { SoundCloudAdapter } from './adapters/soundcloud.adapter';

@Injectable()
export class TokenService {
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(ProviderToken)
    private readonly tokenRepository: Repository<ProviderToken>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SpotifyAdapter))
    private readonly spotifyAdapter: SpotifyAdapter,
    @Inject(forwardRef(() => SoundCloudAdapter))
    private readonly soundCloudAdapter: SoundCloudAdapter,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || '';
  }

  async saveToken(
    providerAccountId: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date | null,
    scope?: string,
  ): Promise<ProviderToken> {
    // Encrypt tokens
    const accessTokenEncrypted = encrypt(accessToken, this.encryptionKey);
    const refreshTokenEncrypted = refreshToken
      ? encrypt(refreshToken, this.encryptionKey)
      : null;

    // Check if token already exists
    let token = await this.tokenRepository.findOne({
      where: { providerAccountId },
    });

    if (token) {
      token.accessTokenEncrypted = accessTokenEncrypted;
      token.refreshTokenEncrypted = refreshTokenEncrypted;
      token.expiresAt = expiresAt;
      token.scope = scope || null;
    } else {
      token = this.tokenRepository.create({
        providerAccountId,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        expiresAt,
        scope: scope || null,
      });
    }

    return this.tokenRepository.save(token);
  }

  async getValidAccessToken(providerAccountId: string): Promise<string> {
    const token = await this.tokenRepository.findOne({
      where: { providerAccountId },
      relations: ['providerAccount'],
    });

    if (!token) {
      throw new Error('Token not found');
    }

    // Check if token is expired or about to expire (5 min buffer)
    const bufferMs = 5 * 60 * 1000;
    const isExpired = token.expiresAt && token.expiresAt.getTime() - bufferMs < Date.now();

    if (isExpired && token.refreshTokenEncrypted) {
      // Refresh the token
      return this.refreshToken(token);
    }

    return decrypt(token.accessTokenEncrypted, this.encryptionKey);
  }

  private async refreshToken(token: ProviderToken): Promise<string> {
    const refreshToken = decrypt(token.refreshTokenEncrypted!, this.encryptionKey);
    const provider = token.providerAccount?.provider;

    if (!provider) {
      throw new Error('Provider not found for token');
    }

    try {
      let result: { accessToken: string; refreshToken: string | null; expiresAt: Date | null; scope?: string };

      if (provider === Provider.SPOTIFY) {
        result = await this.spotifyAdapter.refreshAccessToken(refreshToken);
      } else if (provider === Provider.SOUNDCLOUD) {
        result = await this.soundCloudAdapter.refreshAccessToken(refreshToken);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Save the new tokens
      await this.saveToken(
        token.providerAccountId,
        result.accessToken,
        result.refreshToken,
        result.expiresAt,
        result.scope,
      );

      return result.accessToken;
    } catch (error) {
      // If refresh fails, return the old token and let the caller handle the auth error
      console.error('Failed to refresh token:', error);
      return decrypt(token.accessTokenEncrypted, this.encryptionKey);
    }
  }

  async deleteToken(providerAccountId: string): Promise<void> {
    await this.tokenRepository.delete({ providerAccountId });
  }
}
