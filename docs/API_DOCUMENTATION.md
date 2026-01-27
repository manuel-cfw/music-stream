# API Documentation

## Base URL

```
/api/v1
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/auth/register"
}
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /auth/magic-link
Request a magic link for passwordless login.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Magic link sent to email"
}
```

#### GET /auth/magic-link/verify
Verify magic link token (from email link).

**Query Parameters:**
- `token`: Magic link token

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

#### POST /auth/logout
Logout and invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Providers

#### GET /providers
Get list of available providers and connection status.

**Response (200):**
```json
{
  "providers": [
    {
      "id": "spotify",
      "name": "Spotify",
      "connected": true,
      "account": {
        "id": "uuid",
        "displayName": "John on Spotify",
        "email": "john@spotify.com",
        "imageUrl": "https://..."
      }
    },
    {
      "id": "soundcloud",
      "name": "SoundCloud",
      "connected": false,
      "account": null
    }
  ]
}
```

#### GET /providers/:provider/connect
Initiate OAuth flow for a provider.

**Parameters:**
- `provider`: `spotify` | `soundcloud`

**Response (302):** Redirects to provider OAuth page

#### GET /providers/:provider/callback
OAuth callback handler (internal use).

#### DELETE /providers/:provider
Disconnect a provider account.

**Response (200):**
```json
{
  "message": "Provider disconnected successfully"
}
```

---

### Playlists (Provider Playlists)

#### GET /playlists
Get all playlists from connected providers.

**Query Parameters:**
- `provider`: Filter by provider (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200):**
```json
{
  "playlists": [
    {
      "id": "uuid",
      "provider": "spotify",
      "providerPlaylistId": "spotify_playlist_id",
      "name": "My Playlist",
      "description": "Description",
      "imageUrl": "https://...",
      "trackCount": 50,
      "isPublic": true,
      "isOwner": true,
      "lastSyncedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

#### GET /playlists/:id
Get playlist details with tracks.

**Query Parameters:**
- `page`: Page number for tracks (default: 1)
- `limit`: Tracks per page (default: 50)

**Response (200):**
```json
{
  "playlist": {
    "id": "uuid",
    "provider": "spotify",
    "name": "My Playlist",
    "trackCount": 50
  },
  "tracks": [
    {
      "id": "uuid",
      "provider": "spotify",
      "providerTrackId": "spotify_track_id",
      "name": "Track Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "durationMs": 240000,
      "imageUrl": "https://...",
      "isPlayable": true,
      "position": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 50
  }
}
```

#### POST /playlists/:id/sync
Sync playlist with provider (pull latest data).

**Response (200):**
```json
{
  "syncRun": {
    "id": "uuid",
    "status": "completed",
    "itemsProcessed": 50,
    "itemsAdded": 2,
    "itemsUpdated": 1,
    "itemsRemoved": 0
  }
}
```

---

### Unified Playlists

#### GET /unified-playlists
Get all user's unified playlists.

**Response (200):**
```json
{
  "playlists": [
    {
      "id": "uuid",
      "name": "My Unified Playlist",
      "description": "Mix of Spotify and SoundCloud",
      "imageUrl": "https://...",
      "trackCount": 25,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

#### POST /unified-playlists
Create a new unified playlist.

**Request Body:**
```json
{
  "name": "My New Playlist",
  "description": "Optional description"
}
```

**Response (201):**
```json
{
  "playlist": {
    "id": "uuid",
    "name": "My New Playlist",
    "description": "Optional description",
    "trackCount": 0,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### GET /unified-playlists/:id
Get unified playlist with items.

**Response (200):**
```json
{
  "playlist": {
    "id": "uuid",
    "name": "My Unified Playlist",
    "description": "Description",
    "trackCount": 25
  },
  "items": [
    {
      "id": "uuid",
      "position": 0,
      "isAvailable": true,
      "track": {
        "id": "uuid",
        "provider": "spotify",
        "name": "Track Name",
        "artist": "Artist",
        "durationMs": 240000,
        "imageUrl": "https://..."
      }
    }
  ]
}
```

#### PATCH /unified-playlists/:id
Update unified playlist details.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response (200):**
```json
{
  "playlist": {
    "id": "uuid",
    "name": "Updated Name",
    "description": "Updated description"
  }
}
```

#### DELETE /unified-playlists/:id
Delete a unified playlist.

**Response (204):** No content

#### POST /unified-playlists/:id/items
Add tracks to unified playlist.

**Request Body:**
```json
{
  "trackIds": ["track-uuid-1", "track-uuid-2"],
  "position": 0
}
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "position": 0,
      "track": { ... }
    }
  ]
}
```

#### DELETE /unified-playlists/:id/items/:itemId
Remove item from unified playlist.

**Response (204):** No content

#### PUT /unified-playlists/:id/items/reorder
Reorder items in unified playlist.

**Request Body:**
```json
{
  "itemId": "uuid",
  "newPosition": 5
}
```

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "position": 0
    },
    ...
  ]
}
```

---

### Search

#### GET /search/tracks
Search tracks across all connected providers.

**Query Parameters:**
- `q`: Search query (required)
- `provider`: Filter by provider (optional)
- `limit`: Results per provider (default: 20)

**Response (200):**
```json
{
  "results": {
    "spotify": [
      {
        "id": "uuid",
        "provider": "spotify",
        "providerTrackId": "spotify_track_id",
        "name": "Track Name",
        "artist": "Artist",
        "album": "Album",
        "durationMs": 240000,
        "imageUrl": "https://..."
      }
    ],
    "soundcloud": [
      {
        "id": "uuid",
        "provider": "soundcloud",
        "providerTrackId": "soundcloud_track_id",
        "name": "Track Name",
        "artist": "Artist",
        "durationMs": 180000,
        "imageUrl": "https://..."
      }
    ]
  },
  "query": "search query"
}
```

---

### Sync

#### POST /sync/pull
Pull latest data from all connected providers.

**Response (200):**
```json
{
  "syncRun": {
    "id": "uuid",
    "type": "pull",
    "status": "running"
  }
}
```

#### GET /sync/status
Get current sync status.

**Response (200):**
```json
{
  "activeSyncs": [
    {
      "id": "uuid",
      "type": "pull",
      "status": "running",
      "progress": 45,
      "startedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "lastSync": {
    "id": "uuid",
    "type": "pull",
    "status": "completed",
    "completedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### GET /sync/history
Get sync history.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response (200):**
```json
{
  "syncRuns": [
    {
      "id": "uuid",
      "type": "pull",
      "status": "completed",
      "itemsProcessed": 150,
      "itemsAdded": 5,
      "startedAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:31:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET /sync/conflicts
Get unresolved conflicts.

**Response (200):**
```json
{
  "conflicts": [
    {
      "id": "uuid",
      "type": "track_unavailable",
      "details": {
        "trackName": "Track Name",
        "provider": "spotify",
        "reason": "Track removed from provider"
      },
      "unifiedPlaylist": {
        "id": "uuid",
        "name": "My Playlist"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST /sync/conflicts/:id/resolve
Resolve a conflict.

**Request Body:**
```json
{
  "resolution": "remove"
}
```

**Response (200):**
```json
{
  "conflict": {
    "id": "uuid",
    "resolved": true,
    "resolution": "remove",
    "resolvedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Playback

#### GET /playback/track/:trackId
Get playback information for a track.

**Response (200):**
```json
{
  "track": {
    "id": "uuid",
    "name": "Track Name",
    "provider": "spotify"
  },
  "playback": {
    "type": "web_playback",
    "uri": "spotify:track:xxx",
    "previewUrl": "https://...",
    "externalUrl": "https://open.spotify.com/track/xxx"
  }
}
```

---

### User

#### GET /user/profile
Get current user profile.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "connectedProviders": ["spotify", "soundcloud"]
}
```

#### PATCH /user/profile
Update user profile.

**Request Body:**
```json
{
  "displayName": "New Name"
}
```

#### GET /user/export
Export all user data (GDPR compliance).

**Response (200):**
```json
{
  "user": { ... },
  "providerAccounts": [ ... ],
  "unifiedPlaylists": [ ... ],
  "syncHistory": [ ... ]
}
```

#### DELETE /user/account
Delete user account and all data.

**Response (204):** No content

---

## Rate Limiting

- **General endpoints:** 100 requests/minute
- **Search endpoints:** 30 requests/minute
- **Sync endpoints:** 10 requests/minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315800
```

## Pagination

All list endpoints support pagination:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```
