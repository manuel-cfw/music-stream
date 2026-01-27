import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { unifiedService, playbackService } from '../services/playlist.service';
import { usePlayerStore } from '../store/player.store';
import {
  ArrowLeft,
  Loader2,
  GripVertical,
  Play,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import type { UnifiedItem, Track } from '../types';

export default function UnifiedPlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddTracks, setShowAddTracks] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['unified-playlist', id],
    queryFn: () => unifiedService.getPlaylist(id!),
    enabled: !!id,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ itemId, newPosition }: { itemId: string; newPosition: number }) =>
      unifiedService.reorderItems(id!, itemId, newPosition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-playlist', id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => unifiedService.removeItem(id!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-playlist', id] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const items = data?.items || [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderMutation.mutate({
          itemId: String(active.id),
          newPosition: newIndex,
        });
      }
    }
  };

  const handleRemove = (itemId: string) => {
    removeMutation.mutate(itemId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-spotify-green" size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="text-red-500 mx-auto mb-4" size={64} />
        <h2 className="text-xl font-semibold text-white mb-2">Playlist not found</h2>
        <button
          onClick={() => navigate('/unified')}
          className="mt-4 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/unified')}
          className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{data.playlist.name}</h1>
          {data.playlist.description && (
            <p className="text-neutral-400 mt-1">{data.playlist.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowAddTracks(true)}
          className="flex items-center gap-2 px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
        >
          <Plus size={20} />
          Add Tracks
        </button>
      </div>

      {/* Track Count */}
      <div className="mb-4 text-neutral-400">
        {items.length} {items.length === 1 ? 'track' : 'tracks'}
      </div>

      {/* Track List */}
      {items.length === 0 ? (
        <div className="text-center py-16 bg-neutral-800/50 rounded-xl">
          <Search className="text-neutral-600 mx-auto mb-4" size={48} />
          <h2 className="text-lg font-semibold text-white mb-2">No tracks yet</h2>
          <p className="text-neutral-400 mb-4">
            Add tracks from your connected providers to get started.
          </p>
          <button
            onClick={() => setShowAddTracks(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors"
          >
            <Plus size={18} />
            Add Tracks
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableTrackItem
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Tracks Modal */}
      {showAddTracks && (
        <AddTracksModal
          playlistId={id!}
          onClose={() => setShowAddTracks(false)}
        />
      )}
    </div>
  );
}

function SortableTrackItem({
  item,
  index,
  onRemove,
}: {
  item: UnifiedItem;
  index: number;
  onRemove: () => void;
}) {
  const { setCurrentTrack } = usePlayerStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePlay = async () => {
    try {
      const playbackInfo = await playbackService.getPlaybackInfo(item.track.id);
      setCurrentTrack(item.track, playbackInfo);
    } catch (error) {
      // Open external URL as fallback
      if (item.track.externalUrl) {
        window.open(item.track.externalUrl, '_blank');
      }
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-neutral-800 rounded-lg group hover:bg-neutral-750 transition-colors ${
        !item.isAvailable ? 'opacity-50' : ''
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-neutral-500 hover:text-white cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={20} />
      </button>

      {/* Track Number */}
      <span className="w-8 text-center text-neutral-500 text-sm">{index + 1}</span>

      {/* Play Button */}
      <button
        onClick={handlePlay}
        className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-700 transition-colors"
      >
        <Play size={16} fill="currentColor" />
      </button>

      {/* Track Image */}
      {item.track.imageUrl ? (
        <img
          src={item.track.imageUrl}
          alt={item.track.name}
          className="w-10 h-10 rounded object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-neutral-700 flex items-center justify-center">
          <span className="text-neutral-500 text-xs">🎵</span>
        </div>
      )}

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{item.track.name}</p>
        <p className="text-sm text-neutral-400 truncate">{item.track.artist}</p>
      </div>

      {/* Provider Badge */}
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          item.track.provider === 'spotify'
            ? 'bg-spotify-green/20 text-spotify-green'
            : 'bg-soundcloud-orange/20 text-soundcloud-orange'
        }`}
      >
        {item.track.provider}
      </span>

      {/* Duration */}
      <span className="text-sm text-neutral-500 w-12 text-right">
        {formatDuration(item.track.durationMs)}
      </span>

      {/* External Link */}
      {item.track.externalUrl && (
        <a
          href={item.track.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-neutral-500 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={16} />
        </a>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-neutral-500 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function AddTracksModal({ playlistId, onClose }: { playlistId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, Track[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  const addMutation = useMutation({
    mutationFn: (trackIds: string[]) => unifiedService.addItems(playlistId, trackIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-playlist', playlistId] });
      onClose();
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { searchService } = await import('../services/playlist.service');
      const results = await searchService.searchTracks(searchQuery);
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleTrack = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleAdd = () => {
    if (selectedTracks.size > 0) {
      addMutation.mutate(Array.from(selectedTracks));
    }
  };

  const allTracks = [
    ...(searchResults.spotify || []),
    ...(searchResults.soundcloud || []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-700">
          <h2 className="text-xl font-semibold text-white mb-4">Add Tracks</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-spotify-green"
              placeholder="Search for tracks..."
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {allTracks.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              Search for tracks to add to your playlist
            </div>
          ) : (
            <div className="space-y-2">
              {allTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => toggleTrack(track.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTracks.has(track.id)
                      ? 'bg-spotify-green/20 border border-spotify-green'
                      : 'bg-neutral-700/50 hover:bg-neutral-700'
                  }`}
                >
                  {track.imageUrl && (
                    <img
                      src={track.imageUrl}
                      alt={track.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{track.name}</p>
                    <p className="text-sm text-neutral-400 truncate">{track.artist}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      track.provider === 'spotify'
                        ? 'bg-spotify-green/20 text-spotify-green'
                        : 'bg-soundcloud-orange/20 text-soundcloud-orange'
                    }`}
                  >
                    {track.provider}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-700 flex items-center justify-between">
          <span className="text-neutral-400">
            {selectedTracks.size} track{selectedTracks.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedTracks.size === 0 || addMutation.isPending}
              className="px-4 py-2 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : 'Add to Playlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
