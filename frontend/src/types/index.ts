export interface User {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Provider {
  id: 'spotify' | 'soundcloud';
  name: string;
  connected: boolean;
  account: ProviderAccount | null;
}

export interface ProviderAccount {
  id: string;
  displayName: string | null;
  email: string | null;
  imageUrl: string | null;
}

export interface Track {
  id: string;
  provider: 'spotify' | 'soundcloud';
  providerTrackId: string;
  name: string;
  artist: string | null;
  album: string | null;
  durationMs: number | null;
  imageUrl: string | null;
  isPlayable: boolean;
  externalUrl?: string;
}

export interface Playlist {
  id: string;
  provider: 'spotify' | 'soundcloud';
  providerPlaylistId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
  isPublic: boolean;
  isOwner: boolean;
  lastSyncedAt: string | null;
}

export interface UnifiedPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedItem {
  id: string;
  position: number;
  isAvailable: boolean;
  track: Track;
}

export interface SyncRun {
  id: string;
  type: 'pull' | 'push' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsRemoved: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string | null;
}

export interface Conflict {
  id: string;
  type: 'track_unavailable' | 'track_modified' | 'track_removed' | 'duplicate_detected' | 'sync_failed';
  details: Record<string, unknown>;
  resolved: boolean;
  resolution: string | null;
  unifiedPlaylist: { id: string; name: string } | null;
  track: { id: string; name: string; artist: string | null } | null;
  createdAt: string;
}

export interface PlaybackInfo {
  track: {
    id: string;
    name: string;
    provider: 'spotify' | 'soundcloud';
  };
  playback: {
    type: 'web_playback' | 'preview' | 'external';
    uri?: string;
    previewUrl?: string;
    externalUrl: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
