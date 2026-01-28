// Shared enums used across multiple entities
// Extracted to avoid circular dependencies

export enum Provider {
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
}

export enum ConflictType {
  TRACK_UNAVAILABLE = 'track_unavailable',
  TRACK_MODIFIED = 'track_modified',
  TRACK_REMOVED = 'track_removed',
  DUPLICATE_DETECTED = 'duplicate_detected',
  SYNC_FAILED = 'sync_failed',
}

export enum ConflictResolution {
  KEEP = 'keep',
  REMOVE = 'remove',
  REPLACE = 'replace',
  IGNORE = 'ignore',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum SyncType {
  PULL = 'pull',
  PUSH = 'push',
  FULL = 'full',
}

export enum SyncStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
