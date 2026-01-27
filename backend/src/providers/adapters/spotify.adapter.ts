import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  MusicProvider,
  MusicProviderPlaylist,
  MusicProviderTrack,
  MusicProviderUser,
  PlaybackInfo,
  SearchOptions,
} from '../../common/interfaces';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope?: string;
}

@Injectable()
export class SpotifyAdapter {
  private readonly baseUrl = 'https://api.spotify.com/v1';
  private accessToken: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Create a new instance with an access token
   */
  withToken(accessToken: string): MusicProvider {
    const adapter = new SpotifyAdapterWithToken(
      this.configService,
      this.httpService,
      accessToken,
    );
    return adapter;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<TokenExchangeResult> {
    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('SPOTIFY_REDIRECT_URI');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri || '',
    });

    const response: AxiosResponse<SpotifyTokenResponse> = await firstValueFrom(
      this.httpService.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      ),
    );

    const data = response.data;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresAt,
      scope: data.scope,
    };
  }

  /**
   * Refresh an access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
    const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response: AxiosResponse<SpotifyTokenResponse> = await firstValueFrom(
      this.httpService.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      ),
    );

    const data = response.data;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers return a new refresh token
      expiresAt,
      scope: data.scope,
    };
  }
}

/**
 * Spotify adapter with an access token for making API calls
 */
class SpotifyAdapterWithToken implements MusicProvider {
  private readonly baseUrl = 'https://api.spotify.com/v1';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly accessToken: string,
  ) {}

  getName(): string {
    return 'spotify';
  }

  private async request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.request<T>({
        url,
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        data: options.body,
      }),
    );

    return response.data;
  }

  async getCurrentUser(): Promise<MusicProviderUser> {
    const data = await this.request<{
      id: string;
      display_name: string;
      email: string;
      external_urls: { spotify: string };
      images: Array<{ url: string }>;
      product?: string;
    }>('/me');

    return {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      profileUrl: data.external_urls?.spotify || null,
      imageUrl: data.images?.[0]?.url || null,
      product: data.product,
    };
  }

  async getPlaylists(): Promise<MusicProviderPlaylist[]> {
    const playlists: MusicProviderPlaylist[] = [];
    let url = '/me/playlists?limit=50';

    while (url) {
      const data = await this.request<{
        items: Array<{
          id: string;
          name: string;
          description: string;
          images: Array<{ url: string }>;
          tracks: { total: number };
          public: boolean;
          owner: { id: string };
          snapshot_id: string;
          external_urls: { spotify: string };
        }>;
        next: string | null;
      }>(url);

      const currentUser = await this.getCurrentUser();

      for (const item of data.items) {
        playlists.push({
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.images?.[0]?.url || null,
          trackCount: item.tracks.total,
          isPublic: item.public,
          isOwner: item.owner.id === currentUser.id,
          snapshotId: item.snapshot_id,
          externalUrl: item.external_urls?.spotify || '',
        });
      }

      url = data.next ? data.next.replace(this.baseUrl, '') : '';
    }

    return playlists;
  }

  async getPlaylistItems(playlistId: string): Promise<MusicProviderTrack[]> {
    const tracks: MusicProviderTrack[] = [];
    let url = `/playlists/${playlistId}/tracks?limit=100`;

    while (url) {
      const data = await this.request<{
        items: Array<{
          track: {
            id: string;
            name: string;
            artists: Array<{ name: string }>;
            album: { name: string; images: Array<{ url: string }> };
            duration_ms: number;
            external_ids?: { isrc?: string };
            preview_url: string | null;
            external_urls: { spotify: string };
            is_playable?: boolean;
          } | null;
        }>;
        next: string | null;
      }>(url);

      for (const item of data.items) {
        if (item.track) {
          tracks.push({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists.map((a) => a.name).join(', '),
            album: item.track.album?.name || null,
            durationMs: item.track.duration_ms,
            isrc: item.track.external_ids?.isrc || null,
            previewUrl: item.track.preview_url,
            externalUrl: item.track.external_urls?.spotify || '',
            imageUrl: item.track.album?.images?.[0]?.url || null,
            isPlayable: item.track.is_playable !== false,
          });
        }
      }

      url = data.next ? data.next.replace(this.baseUrl, '') : '';
    }

    return tracks;
  }

  async searchTracks(query: string, options: SearchOptions = {}): Promise<MusicProviderTrack[]> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const data = await this.request<{
      tracks: {
        items: Array<{
          id: string;
          name: string;
          artists: Array<{ name: string }>;
          album: { name: string; images: Array<{ url: string }> };
          duration_ms: number;
          external_ids?: { isrc?: string };
          preview_url: string | null;
          external_urls: { spotify: string };
          is_playable?: boolean;
        }>;
      };
    }>(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}`);

    return data.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album?.name || null,
      durationMs: track.duration_ms,
      isrc: track.external_ids?.isrc || null,
      previewUrl: track.preview_url,
      externalUrl: track.external_urls?.spotify || '',
      imageUrl: track.album?.images?.[0]?.url || null,
      isPlayable: track.is_playable !== false,
    }));
  }

  async createPlaylist(name: string, description?: string): Promise<MusicProviderPlaylist> {
    const user = await this.getCurrentUser();

    const data = await this.request<{
      id: string;
      name: string;
      description: string;
      images: Array<{ url: string }>;
      tracks: { total: number };
      public: boolean;
      owner: { id: string };
      snapshot_id: string;
      external_urls: { spotify: string };
    }>(`/users/${user.id}/playlists`, {
      method: 'POST',
      body: {
        name,
        description: description || '',
        public: false,
      },
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      imageUrl: data.images?.[0]?.url || null,
      trackCount: data.tracks.total,
      isPublic: data.public,
      isOwner: true,
      snapshotId: data.snapshot_id,
      externalUrl: data.external_urls?.spotify || '',
    };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const uris = trackIds.map((id) => `spotify:track:${id}`);

    // Spotify allows max 100 tracks per request
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.request(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: { uris: batch },
      });
    }
  }

  async removeTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const tracks = trackIds.map((id) => ({ uri: `spotify:track:${id}` }));

    // Spotify allows max 100 tracks per request
    for (let i = 0; i < tracks.length; i += 100) {
      const batch = tracks.slice(i, i + 100);
      await this.request(`/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: { tracks: batch },
      });
    }
  }

  async reorderTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength: number = 1,
  ): Promise<void> {
    await this.request(`/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      body: {
        range_start: rangeStart,
        insert_before: insertBefore,
        range_length: rangeLength,
      },
    });
  }

  async getPlaybackInfo(trackId: string): Promise<PlaybackInfo> {
    const user = await this.getCurrentUser();
    const isPremium = user.product === 'premium';

    if (isPremium) {
      return {
        type: 'web_playback',
        uri: `spotify:track:${trackId}`,
        externalUrl: `https://open.spotify.com/track/${trackId}`,
      };
    }

    // For non-premium users, try to get preview URL
    const track = await this.request<{
      preview_url: string | null;
      external_urls: { spotify: string };
    }>(`/tracks/${trackId}`);

    if (track.preview_url) {
      return {
        type: 'preview',
        previewUrl: track.preview_url,
        externalUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${trackId}`,
      };
    }

    return {
      type: 'external',
      externalUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${trackId}`,
    };
  }

  getExternalUrl(trackId: string): string {
    return `https://open.spotify.com/track/${trackId}`;
  }

  async supportsFullPlayback(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user.product === 'premium';
  }
}
