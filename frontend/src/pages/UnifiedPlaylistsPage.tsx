import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { unifiedService } from '../services/playlist.service';
import { Plus, Layers, Loader2, Trash2, MoreVertical } from 'lucide-react';
import type { UnifiedPlaylist } from '../types';

export default function UnifiedPlaylistsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['unified-playlists'],
    queryFn: unifiedService.getPlaylists,
  });

  const deleteMutation = useMutation({
    mutationFn: unifiedService.deletePlaylist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-playlists'] });
    },
  });

  const playlists = data?.playlists || [];

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Unified Playlists</h1>
          <p className="text-neutral-400">
            Create and manage playlists that combine tracks from multiple providers.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
        >
          <Plus size={20} />
          Create Playlist
        </button>
      </div>

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
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onOpen={() => navigate(`/unified/${playlist.id}`)}
              onDelete={() => handleDelete(playlist.id, playlist.name)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && playlists.length === 0 && (
        <div className="text-center py-16">
          <Layers className="text-neutral-600 mx-auto mb-4" size={64} />
          <h2 className="text-xl font-semibold text-white mb-2">No unified playlists yet</h2>
          <p className="text-neutral-400 mb-6">
            Create a unified playlist to combine tracks from Spotify and SoundCloud.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
          >
            <Plus size={20} />
            Create Your First Playlist
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePlaylistModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function PlaylistCard({
  playlist,
  onOpen,
  onDelete,
}: {
  playlist: UnifiedPlaylist;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={onOpen}
      className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-750 transition-colors cursor-pointer group relative"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-spotify-green to-purple-500 flex items-center justify-center flex-shrink-0">
          <Layers size={28} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-spotify-green transition-colors">
            {playlist.name}
          </h3>
          {playlist.description && (
            <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
              {playlist.description}
            </p>
          )}
          <p className="text-sm text-neutral-500 mt-2">
            {playlist.trackCount} tracks
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-700 transition-colors"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
            }}
          />
          <div className="absolute right-4 top-12 z-20 bg-neutral-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-red-400 hover:bg-neutral-600 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CreatePlaylistModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () => unifiedService.createPlaylist(name, description || undefined),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unified-playlists'] });
      onClose();
      navigate(`/unified/${data.playlist.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-white mb-4">Create Unified Playlist</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-spotify-green"
              placeholder="My Unified Playlist"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-spotify-green resize-none"
              placeholder="A mix of my favorite tracks"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 py-3 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
