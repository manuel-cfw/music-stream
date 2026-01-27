/**
 * Interface for music provider adapters
 * All provider implementations must follow this contract
 */
export interface MusicProviderPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
  isPublic: boolean;
  isOwner: boolean;
  snapshotId?: string;
  externalUrl: string;
}

export interface MusicProviderTrack {
  id: string;
  name: string;
  artist: string | null;
  album: string | null;
  durationMs: number | null;
  isrc: string | null;
  previewUrl: string | null;
  externalUrl: string;
  imageUrl: string | null;
  isPlayable: boolean;
}

export interface MusicProviderUser {
  id: string;
  displayName: string | null;
  email: string | null;
  profileUrl: string | null;
  imageUrl: string | null;
  product?: string; // e.g., 'premium' for Spotify
}

export interface PlaybackInfo {
  type: 'web_playback' | 'preview' | 'external';
  uri?: string;
  previewUrl?: string;
  externalUrl: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

export interface MusicProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get current user profile
   */
  getCurrentUser(): Promise<MusicProviderUser>;

  /**
   * Get all playlists for the current user
   */
  getPlaylists(): Promise<MusicProviderPlaylist[]>;

  /**
   * Get tracks in a playlist
   */
  getPlaylistItems(playlistId: string): Promise<MusicProviderTrack[]>;

  /**
   * Search for tracks
   */
  searchTracks(query: string, options?: SearchOptions): Promise<MusicProviderTrack[]>;

  /**
   * Create a new playlist
   * @returns The created playlist
   */
  createPlaylist(name: string, description?: string): Promise<MusicProviderPlaylist>;

  /**
   * Add tracks to a playlist
   */
  addTracks(playlistId: string, trackIds: string[]): Promise<void>;

  /**
   * Remove tracks from a playlist
   */
  removeTracks(playlistId: string, trackIds: string[]): Promise<void>;

  /**
   * Reorder tracks in a playlist
   */
  reorderTracks(
    playlistId: string,
    rangeStart: number,
    insertBefore: number,
    rangeLength?: number,
  ): Promise<void>;

  /**
   * Get playback information for a track
   */
  getPlaybackInfo(trackId: string): Promise<PlaybackInfo>;

  /**
   * Get external URL for a track
   */
  getExternalUrl(trackId: string): string;

  /**
   * Check if the provider supports full playback
   */
  supportsFullPlayback(): Promise<boolean>;
}
