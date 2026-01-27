import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Playlist, PlaylistItem, Track, Provider, ProviderAccount } from '../database/entities';
import { ProvidersService } from '../providers/providers.service';
import { MusicProviderTrack } from '../common/interfaces';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistItem)
    private readonly playlistItemRepository: Repository<PlaylistItem>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    private readonly providersService: ProvidersService,
  ) {}

  async getPlaylists(
    userId: string,
    provider?: Provider,
    page: number = 1,
    limit: number = 20,
  ) {
    const accounts = await this.providersService.getProviderAccounts(userId);
    const accountIds = provider
      ? accounts.filter((a) => a.provider === provider).map((a) => a.id)
      : accounts.map((a) => a.id);

    if (accountIds.length === 0) {
      return { playlists: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const [playlists, total] = await this.playlistRepository.findAndCount({
      where: accountIds.map((id) => ({ providerAccountId: id })),
      relations: ['providerAccount'],
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      playlists: playlists.map((p) => ({
        id: p.id,
        provider: p.providerAccount.provider,
        providerPlaylistId: p.providerPlaylistId,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        trackCount: p.trackCount,
        isPublic: p.isPublic,
        isOwner: p.isOwner,
        lastSyncedAt: p.lastSyncedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPlaylistWithTracks(
    userId: string,
    playlistId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['providerAccount'],
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    // Verify user owns this playlist's provider account
    if (playlist.providerAccount.userId !== userId) {
      throw new NotFoundException('Playlist not found');
    }

    const [items, total] = await this.playlistItemRepository.findAndCount({
      where: { playlistId },
      relations: ['track'],
      order: { position: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      playlist: {
        id: playlist.id,
        provider: playlist.providerAccount.provider,
        name: playlist.name,
        trackCount: playlist.trackCount,
      },
      tracks: items.map((item) => ({
        id: item.track.id,
        provider: item.track.provider,
        providerTrackId: item.track.providerTrackId,
        name: item.track.name,
        artist: item.track.artist,
        album: item.track.album,
        durationMs: item.track.durationMs,
        imageUrl: item.track.imageUrl,
        isPlayable: item.track.isPlayable,
        position: item.position,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async syncPlaylist(userId: string, playlistId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId },
      relations: ['providerAccount'],
    });

    if (!playlist || playlist.providerAccount.userId !== userId) {
      throw new NotFoundException('Playlist not found');
    }

    const adapter = await this.providersService.getAdapter(
      userId,
      playlist.providerAccount.provider,
    );

    // Fetch latest tracks from provider
    const providerTracks = await adapter.getPlaylistItems(playlist.providerPlaylistId);

    // Clear existing items
    await this.playlistItemRepository.delete({ playlistId: playlist.id });

    // Add new tracks
    let itemsAdded = 0;
    let itemsUpdated = 0;

    for (let i = 0; i < providerTracks.length; i++) {
      const providerTrack = providerTracks[i];
      
      // Find or create track
      let track = await this.findOrCreateTrack(
        playlist.providerAccount.provider,
        providerTrack,
      );

      // Check if track was updated
      const wasUpdated = await this.updateTrackIfNeeded(track, providerTrack);
      if (wasUpdated) {
        itemsUpdated++;
      } else {
        itemsAdded++;
      }

      // Create playlist item
      const item = this.playlistItemRepository.create({
        playlistId: playlist.id,
        trackId: track.id,
        position: i,
      });
      await this.playlistItemRepository.save(item);
    }

    // Update playlist metadata
    playlist.trackCount = providerTracks.length;
    playlist.lastSyncedAt = new Date();
    await this.playlistRepository.save(playlist);

    return {
      syncRun: {
        id: playlist.id, // Use playlist ID as sync identifier for now
        status: 'completed',
        itemsProcessed: providerTracks.length,
        itemsAdded,
        itemsUpdated,
        itemsRemoved: 0,
      },
    };
  }

  async syncAllPlaylists(userId: string, provider: Provider) {
    const account = await this.providersService.getProviderAccount(userId, provider);
    if (!account) {
      throw new NotFoundException(`${provider} account not connected`);
    }

    const adapter = await this.providersService.getAdapter(userId, provider);
    const providerPlaylists = await adapter.getPlaylists();

    let playlistsAdded = 0;
    let playlistsUpdated = 0;

    for (const providerPlaylist of providerPlaylists) {
      let playlist = await this.playlistRepository.findOne({
        where: {
          providerAccountId: account.id,
          providerPlaylistId: providerPlaylist.id,
        },
      });

      if (playlist) {
        // Update existing playlist
        playlist.name = providerPlaylist.name;
        playlist.description = providerPlaylist.description;
        playlist.imageUrl = providerPlaylist.imageUrl;
        playlist.trackCount = providerPlaylist.trackCount;
        playlist.isPublic = providerPlaylist.isPublic;
        playlist.isOwner = providerPlaylist.isOwner;
        playlist.snapshotId = providerPlaylist.snapshotId || null;
        playlistsUpdated++;
      } else {
        // Create new playlist
        playlist = this.playlistRepository.create({
          providerAccountId: account.id,
          providerPlaylistId: providerPlaylist.id,
          name: providerPlaylist.name,
          description: providerPlaylist.description,
          imageUrl: providerPlaylist.imageUrl,
          trackCount: providerPlaylist.trackCount,
          isPublic: providerPlaylist.isPublic,
          isOwner: providerPlaylist.isOwner,
          snapshotId: providerPlaylist.snapshotId || null,
        });
        playlistsAdded++;
      }

      await this.playlistRepository.save(playlist);
    }

    return {
      playlistsAdded,
      playlistsUpdated,
      total: providerPlaylists.length,
    };
  }

  private async findOrCreateTrack(
    provider: Provider,
    providerTrack: MusicProviderTrack,
  ): Promise<Track> {
    let track = await this.trackRepository.findOne({
      where: {
        provider,
        providerTrackId: providerTrack.id,
      },
    });

    if (!track) {
      track = this.trackRepository.create({
        provider,
        providerTrackId: providerTrack.id,
        name: providerTrack.name,
        artist: providerTrack.artist,
        album: providerTrack.album,
        durationMs: providerTrack.durationMs,
        isrc: providerTrack.isrc,
        previewUrl: providerTrack.previewUrl,
        externalUrl: providerTrack.externalUrl,
        imageUrl: providerTrack.imageUrl,
        isPlayable: providerTrack.isPlayable,
      });
      track = await this.trackRepository.save(track);
    }

    return track;
  }

  private async updateTrackIfNeeded(
    track: Track,
    providerTrack: MusicProviderTrack,
  ): Promise<boolean> {
    let needsUpdate = false;

    if (track.name !== providerTrack.name) {
      track.name = providerTrack.name;
      needsUpdate = true;
    }
    if (track.artist !== providerTrack.artist) {
      track.artist = providerTrack.artist;
      needsUpdate = true;
    }
    if (track.isPlayable !== providerTrack.isPlayable) {
      track.isPlayable = providerTrack.isPlayable;
      needsUpdate = true;
    }
    if (track.imageUrl !== providerTrack.imageUrl) {
      track.imageUrl = providerTrack.imageUrl;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await this.trackRepository.save(track);
    }

    return needsUpdate;
  }
}
