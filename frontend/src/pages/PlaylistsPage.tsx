import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsService, providersService } from '../services/playlist.service';
import { Loader2, RefreshCw, ListMusic, ChevronRight } from 'lucide-react';
import type { Playlist, Provider } from '../types';

export default function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<'spotify' | 'soundcloud' | undefined>(undefined);

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersService.getProviders,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['playlists', selectedProvider],
    queryFn: () => playlistsService.getPlaylists(selectedProvider),
  });

  const syncMutation = useMutation({
    mutationFn: (provider: 'spotify' | 'soundcloud') => playlistsService.syncAllPlaylists(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const connectedProviders = providersData?.providers.filter((p) => p.connected) || [];
  const playlists = data?.playlists || [];

  const handleSync = (provider: 'spotify' | 'soundcloud') => {
    syncMutation.mutate(provider);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Provider Playlists</h1>
        <p className="text-neutral-400">
          View and manage playlists from your connected providers.
        </p>
      </div>

      {/* Filter & Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedProvider(undefined)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProvider === undefined
                ? 'bg-spotify-green text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            All
          </button>
          {connectedProviders.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedProvider === provider.id
                  ? provider.id === 'spotify'
                    ? 'bg-spotify-green text-white'
                    : 'bg-soundcloud-orange text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {connectedProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSync(provider.id)}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={syncMutation.isPending ? 'animate-spin' : ''}
            />
            Sync {provider.name}
          </button>
        ))}
      </div>

      {/* No Providers Connected */}
      {connectedProviders.length === 0 && (
        <div className="text-center py-16">
          <ListMusic className="text-neutral-600 mx-auto mb-4" size={64} />
          <h2 className="text-xl font-semibold text-white mb-2">No providers connected</h2>
          <p className="text-neutral-400 mb-6">
            Connect Spotify or SoundCloud to see your playlists.
          </p>
          <a
            href="/providers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
          >
            Connect Provider
          </a>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-spotify-green" size={40} />
        </div>
      )}

      {/* Playlists Grid */}
      {!isLoading && playlists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && connectedProviders.length > 0 && playlists.length === 0 && (
        <div className="text-center py-16">
          <ListMusic className="text-neutral-600 mx-auto mb-4" size={64} />
          <h2 className="text-xl font-semibold text-white mb-2">No playlists found</h2>
          <p className="text-neutral-400">
            Sync your providers to import your playlists.
          </p>
        </div>
      )}
    </div>
  );
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <div className="bg-neutral-800 rounded-xl p-4 hover:bg-neutral-750 transition-colors group">
      <div className="flex items-start gap-4">
        {playlist.imageUrl ? (
          <img
            src={playlist.imageUrl}
            alt={playlist.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center ${
              playlist.provider === 'spotify' ? 'bg-spotify-green/20' : 'bg-soundcloud-orange/20'
            }`}
          >
            <ListMusic
              className={
                playlist.provider === 'spotify' ? 'text-spotify-green' : 'text-soundcloud-orange'
              }
              size={24}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate group-hover:text-spotify-green transition-colors">
            {playlist.name}
          </h3>
          <p className="text-sm text-neutral-400 mt-1">{playlist.trackCount} tracks</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                playlist.provider === 'spotify'
                  ? 'bg-spotify-green/20 text-spotify-green'
                  : 'bg-soundcloud-orange/20 text-soundcloud-orange'
              }`}
            >
              {playlist.provider}
            </span>
            {playlist.isOwner && (
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                Owner
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="text-neutral-500 group-hover:text-white transition-colors" size={20} />
      </div>
    </div>
  );
}
