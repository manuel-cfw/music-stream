import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncService } from '../services/playlist.service';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SyncRun, Conflict } from '../types';

export default function SyncCenterPage() {
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: syncService.getStatus,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sync-history'],
    queryFn: () => syncService.getHistory(1, 10),
  });

  const { data: conflictsData } = useQuery({
    queryKey: ['sync-conflicts'],
    queryFn: () => syncService.getConflicts(false),
  });

  const pullMutation = useMutation({
    mutationFn: syncService.pull,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
    },
  });

  const isRunning = statusData?.activeSyncs && statusData.activeSyncs.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Sync Center</h1>
        <p className="text-neutral-400">
          Keep your playlists synchronized across all connected providers.
        </p>
      </div>

      {/* Sync Actions */}
      <div className="bg-neutral-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Sync Playlists</h2>
            <p className="text-sm text-neutral-400">
              Pull the latest playlist data from your connected providers.
            </p>
          </div>
          <button
            onClick={() => pullMutation.mutate()}
            disabled={pullMutation.isPending || isRunning}
            className="flex items-center gap-2 px-6 py-3 bg-spotify-green text-white rounded-lg hover:bg-spotify-green/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={20}
              className={pullMutation.isPending || isRunning ? 'animate-spin' : ''}
            />
            {pullMutation.isPending || isRunning ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Active Sync Status */}
        {isRunning && (
          <div className="mt-4 p-4 bg-spotify-green/10 border border-spotify-green/30 rounded-lg">
            <div className="flex items-center gap-2 text-spotify-green">
              <Loader2 className="animate-spin" size={18} />
              <span className="font-medium">Sync in progress...</span>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {statusData?.lastSync && (
          <div className="mt-4 pt-4 border-t border-neutral-700">
            <div className="flex items-center gap-2 text-neutral-400 text-sm">
              <Clock size={16} />
              Last sync: {new Date(statusData.lastSync.completedAt || '').toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Conflicts Section */}
      {conflictsData?.conflicts && conflictsData.conflicts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-yellow-500" size={24} />
            <h2 className="text-lg font-semibold text-white">
              {conflictsData.conflicts.length} Unresolved Conflict
              {conflictsData.conflicts.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-3">
            {conflictsData.conflicts.slice(0, 3).map((conflict) => (
              <ConflictItem key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>
      )}

      {/* Sync History */}
      <div className="bg-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sync History</h2>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-spotify-green" size={32} />
          </div>
        ) : historyData?.syncRuns && historyData.syncRuns.length > 0 ? (
          <div className="space-y-3">
            {historyData.syncRuns.map((syncRun) => (
              <SyncRunItem key={syncRun.id} syncRun={syncRun} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400">
            <Clock className="mx-auto mb-3" size={40} />
            <p>No sync history yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SyncRunItem({ syncRun }: { syncRun: SyncRun }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (syncRun.status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'failed':
        return <XCircle className="text-red-500" size={20} />;
      case 'running':
        return <Loader2 className="text-spotify-green animate-spin" size={20} />;
      default:
        return <Clock className="text-neutral-500" size={20} />;
    }
  };

  return (
    <div className="bg-neutral-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-neutral-700 transition-colors"
      >
        {getStatusIcon()}
        <div className="flex-1 text-left">
          <p className="font-medium text-white">
            {syncRun.type.charAt(0).toUpperCase() + syncRun.type.slice(1)} Sync
          </p>
          <p className="text-sm text-neutral-400">
            {syncRun.completedAt
              ? new Date(syncRun.completedAt).toLocaleString()
              : syncRun.startedAt
              ? 'In progress...'
              : 'Pending'}
          </p>
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-700">
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-400">Processed</p>
              <p className="text-lg font-semibold text-white">{syncRun.itemsProcessed}</p>
            </div>
            <div className="bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-400">Added</p>
              <p className="text-lg font-semibold text-green-500">{syncRun.itemsAdded}</p>
            </div>
            <div className="bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-400">Updated</p>
              <p className="text-lg font-semibold text-blue-500">{syncRun.itemsUpdated}</p>
            </div>
            <div className="bg-neutral-800 p-3 rounded-lg">
              <p className="text-sm text-neutral-400">Removed</p>
              <p className="text-lg font-semibold text-red-500">{syncRun.itemsRemoved}</p>
            </div>
          </div>
          {syncRun.errorMessage && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {syncRun.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConflictItem({ conflict }: { conflict: Conflict }) {
  const queryClient = useQueryClient();

  const resolveMutation = useMutation({
    mutationFn: (resolution: 'keep' | 'remove' | 'ignore') =>
      syncService.resolveConflict(conflict.id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-conflicts'] });
    },
  });

  return (
    <div className="bg-neutral-800/50 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-1" size={18} />
        <div className="flex-1">
          <p className="text-white font-medium">
            {conflict.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
          {conflict.track && (
            <p className="text-sm text-neutral-400 mt-1">
              Track: {conflict.track.name} {conflict.track.artist && `by ${conflict.track.artist}`}
            </p>
          )}
          {conflict.unifiedPlaylist && (
            <p className="text-sm text-neutral-400">
              Playlist: {conflict.unifiedPlaylist.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => resolveMutation.mutate('ignore')}
            disabled={resolveMutation.isPending}
            className="px-3 py-1 text-sm bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600 transition-colors disabled:opacity-50"
          >
            Ignore
          </button>
          <button
            onClick={() => resolveMutation.mutate('remove')}
            disabled={resolveMutation.isPending}
            className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
