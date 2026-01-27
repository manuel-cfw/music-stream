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

interface SoundCloudTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope?: string;
}

@Injectable()
export class SoundCloudAdapter {
  private readonly baseUrl = 'https://api.soundcloud.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Create a new instance with an access token
   */
  withToken(accessToken: string): MusicProvider {
    return new SoundCloudAdapterWithToken(
      this.configService,
      this.httpService,
      accessToken,
    );
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<TokenExchangeResult> {
    const clientId = this.configService.get<string>('SOUNDCLOUD_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SOUNDCLOUD_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('SOUNDCLOUD_REDIRECT_URI');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId || '',
      client_secret: clientSecret || '',
      redirect_uri: redirectUri || '',
    });

    const response: AxiosResponse<SoundCloudTokenResponse> = await firstValueFrom(
      this.httpService.post<SoundCloudTokenResponse>(
        'https://api.soundcloud.com/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    const data = response.data;
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

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
    const clientId = this.configService.get<string>('SOUNDCLOUD_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SOUNDCLOUD_CLIENT_SECRET');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId || '',
      client_secret: clientSecret || '',
    });

    const response: AxiosResponse<SoundCloudTokenResponse> = await firstValueFrom(
      this.httpService.post<SoundCloudTokenResponse>(
        'https://api.soundcloud.com/oauth2/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    const data = response.data;
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      scope: data.scope,
    };
  }
}

/**
 * SoundCloud adapter with an access token for making API calls
 */
class SoundCloudAdapterWithToken implements MusicProvider {
  private readonly baseUrl = 'https://api.soundcloud.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly accessToken: string,
  ) {}

  getName(): string {
    return 'soundcloud';
  }

  private async request<T>(endpoint: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';

    const separator = endpoint.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}oauth_token=${this.accessToken}`;

    const response: AxiosResponse<T> = await firstValueFrom(
      this.httpService.request<T>({
        url: fullUrl,
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: options.body,
      }),
    );

    return response.data;
  }

  async getCurrentUser(): Promise<MusicProviderUser> {
    const data = await this.request<{
      id: number;
      username: string;
      permalink_url: string;
      avatar_url: string;
    }>('/me');

    return {
      id: String(data.id),
      displayName: data.username,
      email: null, // SoundCloud doesn't provide email
      profileUrl: data.permalink_url,
      imageUrl: data.avatar_url,
    };
  }

  async getPlaylists(): Promise<MusicProviderPlaylist[]> {
    const data = await this.request<
      Array<{
        id: number;
        title: string;
        description: string;
        artwork_url: string;
        track_count: number;
        sharing: string;
        user: { id: number };
        permalink_url: string;
      }>
    >('/me/playlists');

    const currentUser = await this.getCurrentUser();

    return data.map((playlist) => ({
      id: String(playlist.id),
      name: playlist.title,
      description: playlist.description,
      imageUrl: playlist.artwork_url,
      trackCount: playlist.track_count,
      isPublic: playlist.sharing === 'public',
      isOwner: String(playlist.user.id) === currentUser.id,
      externalUrl: playlist.permalink_url,
    }));
  }

  async getPlaylistItems(playlistId: string): Promise<MusicProviderTrack[]> {
    const data = await this.request<{
      tracks: Array<{
        id: number;
        title: string;
        user: { username: string };
        duration: number;
        artwork_url: string;
        stream_url: string;
        permalink_url: string;
        streamable: boolean;
      }>;
    }>(`/playlists/${playlistId}`);

    return data.tracks.map((track) => ({
      id: String(track.id),
      name: track.title,
      artist: track.user?.username || null,
      album: null, // SoundCloud doesn't have albums
      durationMs: track.duration,
      isrc: null,
      previewUrl: track.streamable ? track.stream_url : null,
      externalUrl: track.permalink_url,
      imageUrl: track.artwork_url,
      isPlayable: track.streamable,
    }));
  }

  async searchTracks(query: string, options: SearchOptions = {}): Promise<MusicProviderTrack[]> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const data = await this.request<
      Array<{
        id: number;
        title: string;
        user: { username: string };
        duration: number;
        artwork_url: string;
        stream_url: string;
        permalink_url: string;
        streamable: boolean;
      }>
    >(`/tracks?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);

    return data.map((track) => ({
      id: String(track.id),
      name: track.title,
      artist: track.user?.username || null,
      album: null,
      durationMs: track.duration,
      isrc: null,
      previewUrl: track.streamable ? track.stream_url : null,
      externalUrl: track.permalink_url,
      imageUrl: track.artwork_url,
      isPlayable: track.streamable,
    }));
  }

  async createPlaylist(name: string, description?: string): Promise<MusicProviderPlaylist> {
    const data = await this.request<{
      id: number;
      title: string;
      description: string;
      artwork_url: string;
      track_count: number;
      sharing: string;
      permalink_url: string;
    }>('/playlists', {
      method: 'POST',
      body: {
        playlist: {
          title: name,
          description: description || '',
          sharing: 'private',
        },
      },
    });

    return {
      id: String(data.id),
      name: data.title,
      description: data.description,
      imageUrl: data.artwork_url,
      trackCount: data.track_count,
      isPublic: data.sharing === 'public',
      isOwner: true,
      externalUrl: data.permalink_url,
    };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    // SoundCloud requires updating the entire playlist
    const playlist = await this.request<{ tracks: Array<{ id: number }> }>(
      `/playlists/${playlistId}`,
    );

    const existingTrackIds = playlist.tracks.map((t) => t.id);
    const newTrackIds = trackIds.map((id) => parseInt(id, 10));
    const allTrackIds = [...existingTrackIds, ...newTrackIds];

    await this.request(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: {
        playlist: {
          tracks: allTrackIds.map((id) => ({ id })),
        },
      },
    });
  }

  async removeTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const playlist = await this.request<{ tracks: Array<{ id: number }> }>(
      `/playlists/${playlistId}`,
    );

    const removeIds = new Set(trackIds.map((id) => parseInt(id, 10)));
    const remainingTracks = playlist.tracks.filter((t) => !removeIds.has(t.id));

    await this.request(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: {
        playlist: {
          tracks: remainingTracks.map((t) => ({ id: t.id })),
        },
      },
    });
  }

  async reorderTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength: number = 1,
  ): Promise<void> {
    const playlist = await this.request<{ tracks: Array<{ id: number }> }>(
      `/playlists/${playlistId}`,
    );

    const tracks = [...playlist.tracks];
    const movedTracks = tracks.splice(rangeStart, rangeLength);

    const adjustedInsertBefore =
      insertBefore > rangeStart ? insertBefore - rangeLength : insertBefore;
    tracks.splice(adjustedInsertBefore, 0, ...movedTracks);

    await this.request(`/playlists/${playlistId}`, {
      method: 'PUT',
      body: {
        playlist: {
          tracks: tracks.map((t) => ({ id: t.id })),
        },
      },
    });
  }

  async getPlaybackInfo(trackId: string): Promise<PlaybackInfo> {
    try {
      const track = await this.request<{
        streamable: boolean;
        stream_url: string;
        permalink_url: string;
      }>(`/tracks/${trackId}`);

      if (track.streamable && track.stream_url) {
        return {
          type: 'preview',
          previewUrl: `${track.stream_url}?oauth_token=${this.accessToken}`,
          externalUrl: track.permalink_url,
        };
      }

      return {
        type: 'external',
        externalUrl: track.permalink_url,
      };
    } catch {
      return {
        type: 'external',
        externalUrl: `https://soundcloud.com/tracks/${trackId}`,
      };
    }
  }

  getExternalUrl(trackId: string): string {
    return `https://soundcloud.com/tracks/${trackId}`;
  }

  async supportsFullPlayback(): Promise<boolean> {
    // SoundCloud widget/streaming has limitations
    return false;
  }
}
