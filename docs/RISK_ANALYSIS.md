# Risk Analysis & Mitigation Strategies

## 1. Playback Restrictions

### 1.1 Spotify Playback

**Risk Level:** Medium

**Issue:** Spotify Web Playback SDK requires Spotify Premium for full playback. Free users can only control playback on existing devices.

**Mitigation:**
1. **Premium Users:** Use Spotify Web Playback SDK for in-app playback
2. **Free Users:** 
   - Show 30-second preview (available via API)
   - "Open in Spotify" button with deep link (`spotify:track:{id}`)
   - Clear UI indication of playback limitations

**Implementation:**
```typescript
// Check user's Spotify subscription
const canPlayFull = user.spotifyProduct === 'premium';

// Provide appropriate playback option
if (canPlayFull) {
  return webPlaybackUri;
} else {
  return { previewUrl, externalUrl: `spotify:track:${trackId}` };
}
```

### 1.2 SoundCloud Playback

**Risk Level:** High

**Issue:** SoundCloud API is severely restricted. Widget API available but limited.

**Mitigation:**
1. **Widget Embed:** Use SoundCloud Widget for tracks that allow embedding
2. **Direct Link:** "Open in SoundCloud" for restricted tracks
3. **Stream URL:** Some tracks have direct stream URLs (check `streamable` flag)

**Implementation:**
```typescript
// Check track streaming availability
if (track.streamable && track.stream_url) {
  return track.stream_url;
} else if (track.embeddable) {
  return widgetEmbedUrl;
} else {
  return { externalUrl: track.permalink_url };
}
```

## 2. API Rate Limits

### 2.1 Spotify API Limits

**Risk Level:** Medium

**Limits:**
- Standard: Variable, typically ~180 requests/minute per user
- Playlist operations may have lower limits

**Mitigation:**
1. **Caching:** Cache playlist/track data with TTL
2. **Batching:** Use batch endpoints where available
3. **Exponential Backoff:** Implement retry with backoff
4. **Request Queuing:** Queue non-urgent requests

**Implementation:**
```typescript
// Rate limit handler
async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.headers['retry-after'] || Math.pow(2, i);
        await sleep(retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Rate limit exceeded after max retries');
}
```

### 2.2 SoundCloud API Limits

**Risk Level:** High

**Issue:** SoundCloud API access is now very limited (no new app registrations publicly available).

**Mitigation:**
1. **Apply for API Access:** Contact SoundCloud for API access
2. **Aggressive Caching:** Cache all SoundCloud data longer
3. **Graceful Degradation:** App works without SoundCloud if unavailable
4. **Alternative:** Consider unofficial/widget APIs (with legal review)

## 3. iOS PWA Limitations

### 3.1 Service Worker Support

**Risk Level:** Medium

**Issue:** iOS Safari has limited PWA support:
- Service Workers reset after ~7 days of inactivity
- No push notifications
- Limited storage

**Mitigation:**
1. **Encourage Native App:** Show banner for iOS users about upcoming native app
2. **Essential Caching:** Only cache critical metadata
3. **Re-auth Handling:** Graceful re-authentication flow

### 3.2 Audio Playback

**Risk Level:** Low

**Issue:** iOS requires user gesture for audio playback

**Mitigation:**
1. **User-Initiated Playback:** Require tap/click to start playback
2. **Audio Context Management:** Properly manage audio context lifecycle

## 4. Data Privacy & GDPR

### 4.1 User Data

**Risk Level:** Medium

**Requirements:**
- Right to access (data export)
- Right to erasure (account deletion)
- Data portability

**Implementation:**
```typescript
// Data export endpoint
@Get('export')
async exportUserData(@User() user: UserEntity) {
  return {
    user: await this.usersService.findOne(user.id),
    playlists: await this.playlistsService.findByUser(user.id),
    unifiedPlaylists: await this.unifiedService.findByUser(user.id),
    syncHistory: await this.syncService.getHistory(user.id),
  };
}

// Account deletion
@Delete('account')
async deleteAccount(@User() user: UserEntity) {
  // Cascade delete all user data
  await this.usersService.deleteWithAllData(user.id);
}
```

## 5. Token Security

### 5.1 Token Exposure

**Risk Level:** High

**Issue:** Provider OAuth tokens must never be exposed to frontend

**Mitigation:**
1. **Server-Side Storage:** All tokens stored encrypted on server
2. **Proxy API Calls:** All provider API calls go through backend
3. **Token Rotation:** Automatic refresh before expiry
4. **Audit Logging:** Log all token operations

## 6. Provider API Changes

### 6.1 Breaking Changes

**Risk Level:** Medium

**Issue:** Spotify/SoundCloud may change APIs

**Mitigation:**
1. **Adapter Pattern:** Isolate provider logic
2. **Version Pinning:** Use specific API versions
3. **Monitoring:** Alert on API errors
4. **Fallback Modes:** Graceful degradation

## 7. Offline Functionality

### 7.1 Limited Offline Support

**Risk Level:** Low

**Issue:** Full offline playback not possible without downloaded content

**Mitigation:**
1. **Metadata Caching:** Cache playlist/track metadata
2. **Queue Persistence:** Save playback queue locally
3. **Offline Indication:** Clear UI when offline
4. **Sync on Reconnect:** Auto-sync when back online

## 8. Concurrency & Conflicts

### 8.1 Sync Conflicts

**Risk Level:** Medium

**Issue:** Changes made on provider app while using our app

**Mitigation:**
1. **Conflict Detection:** Compare timestamps
2. **User Resolution:** Show conflicts in UI
3. **Merge Strategy:** Default to "most recent wins"
4. **Audit Trail:** Keep history of changes

## Risk Summary Matrix

| Risk | Likelihood | Impact | Priority | Status |
|------|------------|--------|----------|--------|
| Spotify Playback (Free) | High | Medium | High | Mitigated |
| SoundCloud API Access | High | High | Critical | Monitoring |
| Rate Limits | Medium | Medium | Medium | Mitigated |
| iOS PWA Limits | Medium | Low | Low | Planned |
| Token Security | Low | High | High | Mitigated |
| GDPR Compliance | Medium | High | High | Planned |
| API Changes | Low | Medium | Medium | Mitigated |
| Offline Support | Low | Low | Low | Accepted |
| Sync Conflicts | Medium | Medium | Medium | Mitigated |
