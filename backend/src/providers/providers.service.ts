import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProviderAccount, ProviderToken, Provider } from '../database/entities';
import { TokenService } from './token.service';
import { SpotifyAdapter } from './adapters/spotify.adapter';
import { SoundCloudAdapter } from './adapters/soundcloud.adapter';
import { MusicProvider } from '../common/interfaces';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    @InjectRepository(ProviderToken)
    private readonly providerTokenRepository: Repository<ProviderToken>,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly spotifyAdapter: SpotifyAdapter,
    private readonly soundCloudAdapter: SoundCloudAdapter,
  ) {}

  async getProviderStatus(userId: string) {
    const accounts = await this.providerAccountRepository.find({
      where: { userId },
    });

    const providers = [
      {
        id: Provider.SPOTIFY,
        name: 'Spotify',
        connected: false,
        account: null as ProviderAccount | null,
      },
      {
        id: Provider.SOUNDCLOUD,
        name: 'SoundCloud',
        connected: false,
        account: null as ProviderAccount | null,
      },
    ];

    for (const account of accounts) {
      const providerInfo = providers.find((p) => p.id === account.provider);
      if (providerInfo) {
        providerInfo.connected = true;
        providerInfo.account = account;
      }
    }

    return { providers };
  }

  getOAuthUrl(provider: Provider, state: string): string {
    switch (provider) {
      case Provider.SPOTIFY:
        return this.getSpotifyOAuthUrl(state);
      case Provider.SOUNDCLOUD:
        return this.getSoundCloudOAuthUrl(state);
      default:
        throw new BadRequestException('Invalid provider');
    }
  }

  private getSpotifyOAuthUrl(state: string): string {
    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const redirectUri = this.configService.get<string>('SPOTIFY_REDIRECT_URI');
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId || '',
      response_type: 'code',
      redirect_uri: redirectUri || '',
      state,
      scope: scopes,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  private getSoundCloudOAuthUrl(state: string): string {
    const clientId = this.configService.get<string>('SOUNDCLOUD_CLIENT_ID');
    const redirectUri = this.configService.get<string>('SOUNDCLOUD_REDIRECT_URI');

    const params = new URLSearchParams({
      client_id: clientId || '',
      response_type: 'code',
      redirect_uri: redirectUri || '',
      state,
    });

    return `https://api.soundcloud.com/connect?${params.toString()}`;
  }

  async handleOAuthCallback(
    provider: Provider,
    code: string,
    userId: string,
  ): Promise<ProviderAccount> {
    switch (provider) {
      case Provider.SPOTIFY:
        return this.handleSpotifyCallback(code, userId);
      case Provider.SOUNDCLOUD:
        return this.handleSoundCloudCallback(code, userId);
      default:
        throw new BadRequestException('Invalid provider');
    }
  }

  private async handleSpotifyCallback(code: string, userId: string): Promise<ProviderAccount> {
    const tokens = await this.spotifyAdapter.exchangeCode(code);
    
    // Get user profile
    const adapter = await this.getAdapterWithToken(Provider.SPOTIFY, tokens.accessToken);
    const profile = await adapter.getCurrentUser();

    // Check if account already exists
    let account = await this.providerAccountRepository.findOne({
      where: { userId, provider: Provider.SPOTIFY },
    });

    if (account) {
      // Update existing account
      account.providerUserId = profile.id;
      account.displayName = profile.displayName;
      account.email = profile.email;
      account.profileUrl = profile.profileUrl;
      account.imageUrl = profile.imageUrl;
      account = await this.providerAccountRepository.save(account);

      // Update token
      await this.tokenService.saveToken(
        account.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
        tokens.scope,
      );
    } else {
      // Create new account
      account = this.providerAccountRepository.create({
        userId,
        provider: Provider.SPOTIFY,
        providerUserId: profile.id,
        displayName: profile.displayName,
        email: profile.email,
        profileUrl: profile.profileUrl,
        imageUrl: profile.imageUrl,
      });
      account = await this.providerAccountRepository.save(account);

      // Save token
      await this.tokenService.saveToken(
        account.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
        tokens.scope,
      );
    }

    return account;
  }

  private async handleSoundCloudCallback(code: string, userId: string): Promise<ProviderAccount> {
    const tokens = await this.soundCloudAdapter.exchangeCode(code);
    
    const adapter = await this.getAdapterWithToken(Provider.SOUNDCLOUD, tokens.accessToken);
    const profile = await adapter.getCurrentUser();

    let account = await this.providerAccountRepository.findOne({
      where: { userId, provider: Provider.SOUNDCLOUD },
    });

    if (account) {
      account.providerUserId = profile.id;
      account.displayName = profile.displayName;
      account.profileUrl = profile.profileUrl;
      account.imageUrl = profile.imageUrl;
      account = await this.providerAccountRepository.save(account);

      await this.tokenService.saveToken(
        account.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
      );
    } else {
      account = this.providerAccountRepository.create({
        userId,
        provider: Provider.SOUNDCLOUD,
        providerUserId: profile.id,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
        imageUrl: profile.imageUrl,
      });
      account = await this.providerAccountRepository.save(account);

      await this.tokenService.saveToken(
        account.id,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
      );
    }

    return account;
  }

  async disconnectProvider(userId: string, provider: Provider): Promise<void> {
    const account = await this.providerAccountRepository.findOne({
      where: { userId, provider },
    });

    if (!account) {
      throw new NotFoundException('Provider account not found');
    }

    await this.providerAccountRepository.remove(account);
  }

  async getAdapter(userId: string, provider: Provider): Promise<MusicProvider> {
    const account = await this.providerAccountRepository.findOne({
      where: { userId, provider },
    });

    if (!account) {
      throw new NotFoundException(`${provider} account not connected`);
    }

    const accessToken = await this.tokenService.getValidAccessToken(account.id);

    return this.getAdapterWithToken(provider, accessToken);
  }

  private getAdapterWithToken(provider: Provider, accessToken: string): MusicProvider {
    switch (provider) {
      case Provider.SPOTIFY:
        return this.spotifyAdapter.withToken(accessToken);
      case Provider.SOUNDCLOUD:
        return this.soundCloudAdapter.withToken(accessToken);
      default:
        throw new BadRequestException('Invalid provider');
    }
  }

  async getProviderAccounts(userId: string): Promise<ProviderAccount[]> {
    return this.providerAccountRepository.find({
      where: { userId },
    });
  }

  async getProviderAccount(userId: string, provider: Provider): Promise<ProviderAccount | null> {
    return this.providerAccountRepository.findOne({
      where: { userId, provider },
    });
  }
}
