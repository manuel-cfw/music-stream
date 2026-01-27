import api from './api';
import type { Provider, Playlist, Track, UnifiedPlaylist, UnifiedItem, SyncRun, Conflict, PlaybackInfo } from '../types';

export const providersService = {
  async getProviders(): Promise<{ providers: Provider[] }> {
    const response = await api.get('/providers');
    return response.data;
  },

  async disconnectProvider(provider: 'spotify' | 'soundcloud'): Promise<void> {
    await api.delete(`/providers/${provider}`);
  },

  getConnectUrl(provider: 'spotify' | 'soundcloud'): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    return `${baseUrl}/providers/${provider}/connect`;
  },
};

export const playlistsService = {
  async getPlaylists(provider?: 'spotify' | 'soundcloud', page = 1, limit = 20) {
    const params = new URLSearchParams();
    if (provider) params.append('provider', provider);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await api.get(`/playlists?${params}`);
    return response.data as { playlists: Playlist[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
  },

  async getPlaylist(id: string, page = 1, limit = 50) {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await api.get(`/playlists/${id}?${params}`);
    return response.data as { playlist: Playlist; tracks: Track[] };
  },

  async syncPlaylist(id: string) {
    const response = await api.post(`/playlists/${id}/sync`);
    return response.data;
  },

  async syncAllPlaylists(provider: 'spotify' | 'soundcloud') {
    const response = await api.post(`/playlists/sync/${provider}`);
    return response.data;
  },
};

export const unifiedService = {
  async getPlaylists(): Promise<{ playlists: UnifiedPlaylist[] }> {
    const response = await api.get('/unified-playlists');
    return response.data;
  },

  async createPlaylist(name: string, description?: string): Promise<{ playlist: UnifiedPlaylist }> {
    const response = await api.post('/unified-playlists', { name, description });
    return response.data;
  },

  async getPlaylist(id: string): Promise<{ playlist: UnifiedPlaylist; items: UnifiedItem[] }> {
    const response = await api.get(`/unified-playlists/${id}`);
    return response.data;
  },

  async updatePlaylist(id: string, data: { name?: string; description?: string }) {
    const response = await api.patch(`/unified-playlists/${id}`, data);
    return response.data;
  },

  async deletePlaylist(id: string): Promise<void> {
    await api.delete(`/unified-playlists/${id}`);
  },

  async addItems(playlistId: string, trackIds: string[], position?: number) {
    const response = await api.post(`/unified-playlists/${playlistId}/items`, {
      trackIds,
      position,
    });
    return response.data;
  },

  async removeItem(playlistId: string, itemId: string): Promise<void> {
    await api.delete(`/unified-playlists/${playlistId}/items/${itemId}`);
  },

  async reorderItems(playlistId: string, itemId: string, newPosition: number) {
    const response = await api.put(`/unified-playlists/${playlistId}/items/reorder`, {
      itemId,
      newPosition,
    });
    return response.data;
  },

  async findDuplicates(playlistId: string) {
    const response = await api.get(`/unified-playlists/${playlistId}/duplicates`);
    return response.data;
  },
};

export const searchService = {
  async searchTracks(query: string, provider?: 'spotify' | 'soundcloud') {
    const params = new URLSearchParams();
    params.append('q', query);
    if (provider) params.append('provider', provider);

    const response = await api.get(`/search/tracks?${params}`);
    return response.data as { results: Record<string, Track[]>; query: string };
  },
};

export const syncService = {
  async pull() {
    const response = await api.post('/sync/pull');
    return response.data;
  },

  async getStatus() {
    const response = await api.get('/sync/status');
    return response.data as {
      activeSyncs: SyncRun[];
      lastSync: SyncRun | null;
    };
  },

  async getHistory(page = 1, limit = 20) {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    const response = await api.get(`/sync/history?${params}`);
    return response.data as { syncRuns: SyncRun[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
  },

  async getConflicts(resolved = false) {
    const params = new URLSearchParams();
    params.append('resolved', String(resolved));

    const response = await api.get(`/sync/conflicts?${params}`);
    return response.data as { conflicts: Conflict[] };
  },

  async resolveConflict(id: string, resolution: 'keep' | 'remove' | 'replace' | 'ignore') {
    const response = await api.post(`/sync/conflicts/${id}/resolve`, { resolution });
    return response.data;
  },
};

export const playbackService = {
  async getPlaybackInfo(trackId: string): Promise<PlaybackInfo> {
    const response = await api.get(`/playback/track/${trackId}`);
    return response.data;
  },
};
