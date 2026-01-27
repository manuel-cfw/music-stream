import { usePlayerStore } from '../../store/player.store';
import { Play, Pause, SkipBack, SkipForward, ExternalLink, Volume2 } from 'lucide-react';

export default function PlayerBar() {
  const { currentTrack, playbackInfo, isPlaying, setIsPlaying } = usePlayerStore();

  if (!currentTrack || !playbackInfo) return null;

  const canPlayInApp =
    playbackInfo.playback.type === 'web_playback' ||
    playbackInfo.playback.type === 'preview';

  const handlePlayPause = () => {
    if (canPlayInApp) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleOpenExternal = () => {
    window.open(playbackInfo.playback.externalUrl, '_blank');
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 bg-neutral-900 border-t border-neutral-800 px-4 flex items-center justify-between">
      {/* Track info */}
      <div className="flex items-center gap-4 w-72">
        {currentTrack.imageUrl && (
          <img
            src={currentTrack.imageUrl}
            alt={currentTrack.name}
            className="w-14 h-14 rounded object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{currentTrack.name}</p>
          <p className="text-sm text-neutral-400 truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Player controls */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button className="text-neutral-400 hover:text-white transition-colors">
            <SkipBack size={20} />
          </button>

          {canPlayInApp ? (
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause size={20} className="text-black" fill="black" />
              ) : (
                <Play size={20} className="text-black ml-0.5" fill="black" />
              )}
            </button>
          ) : (
            <button
              onClick={handleOpenExternal}
              className="px-4 py-2 rounded-full bg-spotify-green text-white text-sm font-medium hover:scale-105 transition-transform flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Open in {currentTrack.provider === 'spotify' ? 'Spotify' : 'SoundCloud'}
            </button>
          )}

          <button className="text-neutral-400 hover:text-white transition-colors">
            <SkipForward size={20} />
          </button>
        </div>

        {canPlayInApp && (
          <div className="flex items-center gap-2 w-80">
            <span className="text-xs text-neutral-400">0:00</span>
            <div className="flex-1 h-1 bg-neutral-700 rounded-full">
              <div className="h-full w-0 bg-white rounded-full" />
            </div>
            <span className="text-xs text-neutral-400">
              {formatDuration(currentTrack.durationMs)}
            </span>
          </div>
        )}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-72 justify-end">
        <Volume2 size={20} className="text-neutral-400" />
        <div className="w-24 h-1 bg-neutral-700 rounded-full">
          <div className="h-full w-3/4 bg-white rounded-full" />
        </div>
      </div>
    </div>
  );
}
