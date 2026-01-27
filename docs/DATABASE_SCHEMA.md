# Database Schema Documentation

## Entity Relationship Diagram (Text)

```
┌─────────────────┐       ┌─────────────────────┐
│     users       │       │  provider_accounts  │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │──────<│ user_id (FK)        │
│ email           │       │ id (PK)             │
│ password_hash   │       │ provider            │
│ display_name    │       │ provider_user_id    │
│ created_at      │       │ display_name        │
│ updated_at      │       │ created_at          │
└─────────────────┘       └──────────┬──────────┘
                                     │
                                     │
                          ┌──────────▼──────────┐
                          │   provider_tokens   │
                          ├─────────────────────┤
                          │ id (PK)             │
                          │ provider_account_id │
                          │ access_token_enc    │
                          │ refresh_token_enc   │
                          │ token_type          │
                          │ expires_at          │
                          │ scope               │
                          │ created_at          │
                          │ updated_at          │
                          └─────────────────────┘

┌─────────────────┐       ┌─────────────────────┐
│    playlists    │       │   playlist_items    │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │──────<│ playlist_id (FK)    │
│ provider_acct_id│       │ id (PK)             │
│ provider_plst_id│       │ track_id (FK)       │
│ name            │       │ position            │
│ description     │       │ added_at            │
│ image_url       │       │ added_by            │
│ track_count     │       └──────────┬──────────┘
│ is_public       │                  │
│ snapshot_id     │       ┌──────────▼──────────┐
│ last_synced_at  │       │      tracks         │
│ created_at      │       ├─────────────────────┤
│ updated_at      │       │ id (PK)             │
└─────────────────┘       │ provider            │
                          │ provider_track_id   │
                          │ name                │
                          │ artist              │
                          │ album               │
                          │ duration_ms         │
                          │ isrc                │
                          │ preview_url         │
                          │ external_url        │
                          │ image_url           │
                          │ is_playable         │
                          │ created_at          │
                          │ updated_at          │
                          └─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│  unified_playlists  │       │   unified_items     │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │──────<│ unified_playlist_id │
│ user_id (FK)        │       │ id (PK)             │
│ name                │       │ track_id (FK)       │
│ description         │       │ position            │
│ image_url           │       │ is_available        │
│ created_at          │       │ added_at            │
│ updated_at          │       │ created_at          │
└─────────────────────┘       │ updated_at          │
                              └─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│     sync_runs       │       │     conflicts       │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │──────<│ sync_run_id (FK)    │
│ user_id (FK)        │       │ id (PK)             │
│ provider_acct_id(FK)│       │ unified_item_id(FK) │
│ type (pull/push)    │       │ conflict_type       │
│ status              │       │ details             │
│ items_processed     │       │ resolved            │
│ items_added         │       │ resolved_at         │
│ items_updated       │       │ resolution          │
│ items_removed       │       │ created_at          │
│ errors              │       └─────────────────────┘
│ started_at          │
│ completed_at        │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│     audit_log       │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ action              │
│ entity_type         │
│ entity_id           │
│ old_values          │
│ new_values          │
│ ip_address          │
│ user_agent          │
│ created_at          │
└─────────────────────┘
```

## SQL DDL (MariaDB)

```sql
-- Users table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    magic_link_token VARCHAR(255),
    magic_link_expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_magic_link (magic_link_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Provider accounts (Spotify, SoundCloud connections)
CREATE TABLE provider_accounts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    provider ENUM('spotify', 'soundcloud') NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255),
    profile_url VARCHAR(500),
    image_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_provider (user_id, provider),
    INDEX idx_provider_accounts_provider (provider),
    INDEX idx_provider_accounts_provider_user (provider, provider_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Provider tokens (encrypted)
CREATE TABLE provider_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    provider_account_id CHAR(36) NOT NULL UNIQUE,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at DATETIME,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cached tracks from providers
CREATE TABLE tracks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    provider ENUM('spotify', 'soundcloud') NOT NULL,
    provider_track_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    artist VARCHAR(500),
    album VARCHAR(500),
    duration_ms INT,
    isrc VARCHAR(20),
    preview_url VARCHAR(500),
    external_url VARCHAR(500),
    image_url VARCHAR(500),
    is_playable BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_provider_track (provider, provider_track_id),
    INDEX idx_tracks_name_artist (name(100), artist(100)),
    INDEX idx_tracks_isrc (isrc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cached playlists from providers
CREATE TABLE playlists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    provider_account_id CHAR(36) NOT NULL,
    provider_playlist_id VARCHAR(255) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    track_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    is_owner BOOLEAN DEFAULT TRUE,
    snapshot_id VARCHAR(255),
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY uk_provider_playlist (provider_account_id, provider_playlist_id),
    INDEX idx_playlists_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Playlist items (tracks in a provider playlist)
CREATE TABLE playlist_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    playlist_id CHAR(36) NOT NULL,
    track_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    added_at DATETIME,
    added_by VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    UNIQUE KEY uk_playlist_position (playlist_id, position),
    INDEX idx_playlist_items_track (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unified playlists (user-created, cross-provider)
CREATE TABLE unified_playlists (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_unified_playlists_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unified playlist items
CREATE TABLE unified_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    unified_playlist_id CHAR(36) NOT NULL,
    track_id CHAR(36) NOT NULL,
    position INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (unified_playlist_id) REFERENCES unified_playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_unified_position (unified_playlist_id, position),
    INDEX idx_unified_items_track (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync runs history
CREATE TABLE sync_runs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    provider_account_id CHAR(36),
    sync_type ENUM('pull', 'push', 'full') NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    items_processed INT DEFAULT 0,
    items_added INT DEFAULT 0,
    items_updated INT DEFAULT 0,
    items_removed INT DEFAULT 0,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_account_id) REFERENCES provider_accounts(id) ON DELETE SET NULL,
    INDEX idx_sync_runs_user (user_id),
    INDEX idx_sync_runs_status (status),
    INDEX idx_sync_runs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync conflicts
CREATE TABLE conflicts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sync_run_id CHAR(36) NOT NULL,
    unified_item_id CHAR(36),
    conflict_type ENUM('track_unavailable', 'track_modified', 'track_removed', 'duplicate_detected', 'sync_failed') NOT NULL,
    details JSON,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME,
    resolution ENUM('keep', 'remove', 'replace', 'ignore'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sync_run_id) REFERENCES sync_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (unified_item_id) REFERENCES unified_items(id) ON DELETE SET NULL,
    INDEX idx_conflicts_sync_run (sync_run_id),
    INDEX idx_conflicts_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log for GDPR compliance and security
CREATE TABLE audit_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id CHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_log_user (user_id),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_entity (entity_type, entity_id),
    INDEX idx_audit_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User settings/preferences
CREATE TABLE user_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    theme ENUM('light', 'dark', 'system') DEFAULT 'system',
    default_provider ENUM('spotify', 'soundcloud'),
    auto_sync_enabled BOOLEAN DEFAULT FALSE,
    sync_interval_minutes INT DEFAULT 60,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens for JWT auth
CREATE TABLE refresh_tokens (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_hash (token_hash),
    INDEX idx_refresh_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Migration Strategy

### Approach: TypeORM Migrations

1. **Initial Migration:** Create all base tables
2. **Incremental Migrations:** For schema changes
3. **Seed Data:** Optional test data for development

### Migration Commands

```bash
# Generate migration from entity changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Best Practices

1. **Never modify executed migrations** - Create new ones
2. **Test migrations** on a copy of production data
3. **Backup before migrating** in production
4. **Use transactions** where possible
5. **Keep migrations small** and focused
