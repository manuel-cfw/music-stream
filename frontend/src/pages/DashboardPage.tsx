import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { providersService, unifiedService, syncService } from '../services/playlist.service';
import { useAuthStore } from '../store/auth.store';
import {
  ListMusic,
  Layers,
  RefreshCw,
  ChevronRight,
  Link as LinkIcon,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersService.getProviders,
  });

  const { data: unifiedData } = useQuery({
    queryKey: ['unified-playlists'],
    queryFn: unifiedService.getPlaylists,
  });

  const { data: syncData } = useQuery({
    queryKey: ['sync-status'],
    queryFn: syncService.getStatus,
  });

  const connectedProviders = providersData?.providers.filter((p) => p.connected) || [];
  const unifiedPlaylists = unifiedData?.playlists || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </h1>
        <p className="text-neutral-400">
          Manage your unified playlists across Spotify and SoundCloud.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Connected Providers */}
        <Link
          to="/providers"
          className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-750 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-spotify-green/20 rounded-lg">
              <LinkIcon className="text-spotify-green" size={24} />
            </div>
            <ChevronRight className="text-neutral-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-white">{connectedProviders.length}/2</h3>
          <p className="text-neutral-400">Connected Providers</p>
        </Link>

        {/* Unified Playlists */}
        <Link
          to="/unified"
          className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-750 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Layers className="text-purple-500" size={24} />
            </div>
            <ChevronRight className="text-neutral-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-white">{unifiedPlaylists.length}</h3>
          <p className="text-neutral-400">Unified Playlists</p>
        </Link>

        {/* Sync Status */}
        <Link
          to="/sync"
          className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-750 transition-colors group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <RefreshCw className="text-blue-500" size={24} />
            </div>
            <ChevronRight className="text-neutral-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-bold text-white">
            {syncData?.lastSync ? 'Synced' : 'Not synced'}
          </h3>
          <p className="text-neutral-400">
            {syncData?.lastSync
              ? `Last: ${new Date(syncData.lastSync.completedAt || '').toLocaleDateString()}`
              : 'No sync yet'}
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Providers */}
        <div className="bg-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <LinkIcon size={20} />
            Connected Providers
          </h2>

          {connectedProviders.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="text-yellow-500 mx-auto mb-3" size={40} />
              <p className="text-neutral-400 mb-4">No providers connected yet</p>
              <Link
                to="/providers"
                className="inline-flex items-center gap-2 px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
              >
                Connect Provider
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {providersData?.providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-4 p-3 bg-neutral-700/50 rounded-lg"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      provider.id === 'spotify' ? 'bg-spotify-green' : 'bg-soundcloud-orange'
                    }`}
                  >
                    <ListMusic size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{provider.name}</p>
                    <p className="text-sm text-neutral-400">
                      {provider.connected
                        ? provider.account?.displayName || 'Connected'
                        : 'Not connected'}
                    </p>
                  </div>
                  {provider.connected ? (
                    <CheckCircle className="text-spotify-green" size={20} />
                  ) : (
                    <span className="text-neutral-500 text-sm">Disconnected</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Unified Playlists */}
        <div className="bg-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Layers size={20} />
            Recent Unified Playlists
          </h2>

          {unifiedPlaylists.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="text-neutral-600 mx-auto mb-3" size={40} />
              <p className="text-neutral-400 mb-4">No unified playlists yet</p>
              <Link
                to="/unified"
                className="inline-flex items-center gap-2 px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
              >
                Create Playlist
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {unifiedPlaylists.slice(0, 5).map((playlist) => (
                <Link
                  key={playlist.id}
                  to={`/unified/${playlist.id}`}
                  className="flex items-center gap-4 p-3 bg-neutral-700/50 rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-spotify-green to-purple-500 flex items-center justify-center">
                    <Layers size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{playlist.name}</p>
                    <p className="text-sm text-neutral-400">{playlist.trackCount} tracks</p>
                  </div>
                  <ChevronRight className="text-neutral-500" size={20} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
