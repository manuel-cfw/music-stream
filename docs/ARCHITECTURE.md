# Unified Playlist Manager - Architecture Documentation

## 1. System Overview

The Unified Playlist Manager is a web application that allows users to connect their Spotify and SoundCloud accounts, view playlists from both platforms, and create unified playlists that combine tracks from both services.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Clients                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │   PWA (React)       │    │   Mobile App        │                         │
│  │   Windows/Web       │    │   (Future: iOS)     │                         │
│  └──────────┬──────────┘    └──────────┬──────────┘                         │
└─────────────┼───────────────────────────┼───────────────────────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API Gateway / Backend                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    NestJS Backend (/api/v1)                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ Auth Module │  │ Provider    │  │ Playlist    │  │ Sync        │   │  │
│  │  │             │  │ Module      │  │ Module      │  │ Module      │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │               Provider Adapter Layer                             │  │  │
│  │  │  ┌─────────────────┐    ┌─────────────────┐                     │  │  │
│  │  │  │ SpotifyProvider │    │SoundCloudProvider│                    │  │  │
│  │  │  └─────────────────┘    └─────────────────┘                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         MariaDB                                        │  │
│  │  users, provider_accounts, provider_tokens, playlists, tracks,        │  │
│  │  playlist_items, unified_playlists, unified_items, sync_runs,         │  │
│  │  conflicts, audit_log                                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       External Services                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐                         │
│  │   Spotify API       │    │   SoundCloud API    │                         │
│  │   (OAuth 2.0)       │    │   (OAuth 2.0)       │                         │
│  └─────────────────────┘    └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Component Details

### 2.1 Frontend (PWA)

**Technology:** React 18 + TypeScript + Vite

**Key Features:**
- Progressive Web App with Service Worker
- Offline metadata caching
- Install prompt for Windows
- Responsive design (Desktop-first, mobile-friendly)

**Main Pages:**
1. **Auth Pages** - Login/Register with Magic Link
2. **Dashboard** - Overview of connected providers
3. **Playlist Browser** - View Spotify and SoundCloud playlists
4. **Unified Playlist Editor** - Drag & drop interface
5. **Sync Center** - Manage sync operations and conflicts

### 2.2 Backend (NestJS)

**Technology:** NestJS + TypeScript + TypeORM

**Modules:**
1. **AuthModule** - JWT authentication, Magic Link
2. **UsersModule** - User management
3. **ProvidersModule** - OAuth handling, provider connections
4. **PlaylistsModule** - Playlist CRUD operations
5. **UnifiedModule** - Unified playlist logic
6. **SyncModule** - Sync operations, conflict resolution

### 2.3 Provider Adapter Pattern

```typescript
interface MusicProvider {
  getPlaylists(): Promise<Playlist[]>;
  getPlaylistItems(playlistId: string): Promise<Track[]>;
  searchTrack(query: string): Promise<Track[]>;
  createPlaylist(name: string, description?: string): Promise<Playlist>;
  addTracks(playlistId: string, trackIds: string[]): Promise<void>;
  removeTracks(playlistId: string, trackIds: string[]): Promise<void>;
  reorderTracks(playlistId: string, rangeStart: number, insertBefore: number): Promise<void>;
  getPlaybackUri(trackId: string): Promise<string | null>;
  getExternalUrl(trackId: string): string;
}
```

### 2.4 Token Security

**Encryption Strategy:**
- AES-256-GCM for encrypting provider tokens
- Master key stored in environment variable
- Per-token random IV
- Auth tags stored with encrypted data

```
┌─────────────────────────────────────────────┐
│ Token Storage Format                         │
├─────────────────────────────────────────────┤
│ IV (12 bytes) + Auth Tag (16 bytes) +       │
│ Encrypted Token (variable)                   │
└─────────────────────────────────────────────┘
```

## 3. Data Flow

### 3.1 OAuth Flow

```
User → Frontend → Backend → Provider OAuth → Callback → 
Token Encryption → Store in DB → Redirect to Frontend
```

### 3.2 Playlist Sync Flow

```
User triggers sync → Backend fetches provider playlists →
Compare with cached data → Update cache → Check for conflicts →
Store sync run → Return results to Frontend
```

### 3.3 Unified Playlist Creation

```
User selects tracks → Backend validates track availability →
Create unified playlist → Store items with provider references →
Return unified playlist to Frontend
```

## 4. API Design

### 4.1 API Versioning

All endpoints are versioned under `/api/v1/`

### 4.2 Authentication

- JWT tokens with 15-minute access token expiry
- Refresh tokens with 7-day expiry
- HTTP-only cookies for refresh tokens (XSS protection)

### 4.3 Error Handling

Standard error response format:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## 5. Security Considerations

1. **Token Storage:** All provider tokens encrypted at rest
2. **HTTPS:** Required in production
3. **CORS:** Configured for specific origins
4. **Rate Limiting:** Applied to all endpoints
5. **Input Validation:** DTOs with class-validator
6. **SQL Injection:** Prevented via TypeORM parameterized queries

## 6. Scalability

The architecture supports:
- Horizontal scaling of backend instances
- Database read replicas
- Redis for session/cache (future enhancement)
- CDN for static assets

## 7. Future Considerations

1. **Mobile App:** API-first design enables iOS/Android clients
2. **Additional Providers:** Adapter pattern allows easy addition
3. **Real-time Updates:** WebSocket support can be added
4. **Analytics:** Event tracking infrastructure ready
