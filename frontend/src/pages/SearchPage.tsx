import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { searchService, playbackService } from '../services/playlist.service';
import { usePlayerStore } from '../store/player.store';
import { Search as SearchIcon, Loader2, Play, ExternalLink } from 'lucide-react';
import type { Track } from '../types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, Track[]>>({});

  const searchMutation = useMutation({
    mutationFn: (q: string) => searchService.searchTracks(q),
    onSuccess: (data) => {
      setResults(data.results);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchMutation.mutate(query);
    }
  };

  const allTracks = [
    ...(results.spotify || []),
    ...(results.soundcloud || []),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Search</h1>
        <p className="text-neutral-400">
          Search for tracks across all your connected providers.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-spotify-green text-lg"
              placeholder="What do you want to listen to?"
            />
          </div>
          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="px-8 py-4 bg-spotify-green text-white font-medium rounded-xl hover:bg-spotify-green/90 transition-colors disabled:opacity-50"
          >
            {searchMutation.isPending ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {allTracks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white mb-4">
            {allTracks.length} result{allTracks.length !== 1 ? 's' : ''}
          </h2>
          {allTracks.map((track) => (
            <TrackResult key={track.id} track={track} />
          ))}
        </div>
      )}

      {/* No Results */}
      {searchMutation.isSuccess && allTracks.length === 0 && (
        <div className="text-center py-16">
          <SearchIcon className="text-neutral-600 mx-auto mb-4" size={64} />
          <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
          <p className="text-neutral-400">
            Try searching for something else.
          </p>
        </div>
      )}

      {/* Initial State */}
      {!searchMutation.isSuccess && allTracks.length === 0 && (
        <div className="text-center py-16">
          <SearchIcon className="text-neutral-600 mx-auto mb-4" size={64} />
          <h2 className="text-xl font-semibold text-white mb-2">Find your music</h2>
          <p className="text-neutral-400">
            Search for songs, artists, or albums.
          </p>
        </div>
      )}
    </div>
  );
}

function TrackResult({ track }: { track: Track }) {
  const { setCurrentTrack } = usePlayerStore();

  const handlePlay = async () => {
    try {
      const playbackInfo = await playbackService.getPlaybackInfo(track.id);
      setCurrentTrack(track, playbackInfo);
    } catch (error) {
      if (track.externalUrl) {
        window.open(track.externalUrl, '_blank');
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
    <div className="flex items-center gap-4 p-4 bg-neutral-800 rounded-lg hover:bg-neutral-750 transition-colors group">
      {/* Play Button */}
      <button
        onClick={handlePlay}
        className="p-3 bg-spotify-green rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
      >
        <Play size={20} fill="white" />
      </button>

      {/* Track Image */}
      {track.imageUrl ? (
        <img
          src={track.imageUrl}
          alt={track.name}
          className="w-12 h-12 rounded object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-neutral-700 flex items-center justify-center">
          <span className="text-2xl">🎵</span>
        </div>
      )}

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{track.name}</p>
        <p className="text-sm text-neutral-400 truncate">
          {track.artist}
          {track.album && ` • ${track.album}`}
        </p>
      </div>

      {/* Provider Badge */}
      <span
        className={`text-xs px-2 py-1 rounded ${
          track.provider === 'spotify'
            ? 'bg-spotify-green/20 text-spotify-green'
            : 'bg-soundcloud-orange/20 text-soundcloud-orange'
        }`}
      >
        {track.provider}
      </span>

      {/* Duration */}
      <span className="text-sm text-neutral-500 w-12 text-right">
        {formatDuration(track.durationMs)}
      </span>

      {/* External Link */}
      {track.externalUrl && (
        <a
          href={track.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-neutral-500 hover:text-white rounded transition-colors"
        >
          <ExternalLink size={18} />
        </a>
      )}
    </div>
  );
}
