import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UnifiedPlaylist, UnifiedItem, Track, Provider } from '../database/entities';
import { ProvidersService } from '../providers/providers.service';

@Injectable()
export class UnifiedService {
  constructor(
    @InjectRepository(UnifiedPlaylist)
    private readonly playlistRepository: Repository<UnifiedPlaylist>,
    @InjectRepository(UnifiedItem)
    private readonly itemRepository: Repository<UnifiedItem>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
    private readonly providersService: ProvidersService,
  ) {}

  async getPlaylists(userId: string) {
    const playlists = await this.playlistRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    // Get track counts
    const playlistsWithCounts = await Promise.all(
      playlists.map(async (playlist) => {
        const count = await this.itemRepository.count({
          where: { unifiedPlaylistId: playlist.id },
        });
        return {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
          imageUrl: playlist.imageUrl,
          trackCount: count,
          createdAt: playlist.createdAt,
          updatedAt: playlist.updatedAt,
        };
      }),
    );

    return { playlists: playlistsWithCounts };
  }

  async createPlaylist(userId: string, name: string, description?: string) {
    const playlist = this.playlistRepository.create({
      userId,
      name,
      description: description || null,
    });

    const saved = await this.playlistRepository.save(playlist);

    return {
      playlist: {
        id: saved.id,
        name: saved.name,
        description: saved.description,
        trackCount: 0,
        createdAt: saved.createdAt,
      },
    };
  }

  async getPlaylist(userId: string, playlistId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const items = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
      relations: ['track'],
      order: { position: 'ASC' },
    });

    return {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: items.length,
      },
      items: items.map((item) => ({
        id: item.id,
        position: item.position,
        isAvailable: item.isAvailable,
        track: {
          id: item.track.id,
          provider: item.track.provider,
          name: item.track.name,
          artist: item.track.artist,
          album: item.track.album,
          durationMs: item.track.durationMs,
          imageUrl: item.track.imageUrl,
          isPlayable: item.track.isPlayable,
          externalUrl: item.track.externalUrl,
        },
      })),
    };
  }

  async updatePlaylist(
    userId: string,
    playlistId: string,
    updates: { name?: string; description?: string },
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (updates.name) playlist.name = updates.name;
    if (updates.description !== undefined) playlist.description = updates.description;

    await this.playlistRepository.save(playlist);

    return {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
      },
    };
  }

  async deletePlaylist(userId: string, playlistId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    await this.playlistRepository.remove(playlist);
  }

  async addItems(
    userId: string,
    playlistId: string,
    trackIds: string[],
    position?: number,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    // Verify tracks exist
    const tracks = await this.trackRepository.find({
      where: { id: In(trackIds) },
    });

    if (tracks.length !== trackIds.length) {
      throw new BadRequestException('One or more tracks not found');
    }

    // Get current max position
    const currentItems = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
      order: { position: 'ASC' },
    });

    let insertPosition = position !== undefined ? position : currentItems.length;

    // If inserting in the middle, shift existing items
    if (position !== undefined && position < currentItems.length) {
      for (const item of currentItems) {
        if (item.position >= position) {
          item.position += trackIds.length;
          await this.itemRepository.save(item);
        }
      }
    }

    // Create new items
    const newItems: UnifiedItem[] = [];
    for (let i = 0; i < trackIds.length; i++) {
      const track = tracks.find((t) => t.id === trackIds[i]);
      if (track) {
        const item = this.itemRepository.create({
          unifiedPlaylistId: playlistId,
          trackId: track.id,
          position: insertPosition + i,
          isAvailable: track.isPlayable,
        });
        const saved = await this.itemRepository.save(item);
        newItems.push(saved);
      }
    }

    // Load tracks for response
    const itemsWithTracks = await this.itemRepository.find({
      where: { id: In(newItems.map((i) => i.id)) },
      relations: ['track'],
    });

    return {
      items: itemsWithTracks.map((item) => ({
        id: item.id,
        position: item.position,
        track: {
          id: item.track.id,
          provider: item.track.provider,
          name: item.track.name,
          artist: item.track.artist,
          durationMs: item.track.durationMs,
          imageUrl: item.track.imageUrl,
        },
      })),
    };
  }

  async removeItem(userId: string, playlistId: string, itemId: string) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const item = await this.itemRepository.findOne({
      where: { id: itemId, unifiedPlaylistId: playlistId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const removedPosition = item.position;
    await this.itemRepository.remove(item);

    // Shift positions of items after the removed one
    const itemsToUpdate = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
    });

    for (const i of itemsToUpdate) {
      if (i.position > removedPosition) {
        i.position -= 1;
        await this.itemRepository.save(i);
      }
    }
  }

  async reorderItems(
    userId: string,
    playlistId: string,
    itemId: string,
    newPosition: number,
  ) {
    const playlist = await this.playlistRepository.findOne({
      where: { id: playlistId, userId },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const item = await this.itemRepository.findOne({
      where: { id: itemId, unifiedPlaylistId: playlistId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const oldPosition = item.position;

    if (oldPosition === newPosition) {
      // No change needed
      const items = await this.itemRepository.find({
        where: { unifiedPlaylistId: playlistId },
        order: { position: 'ASC' },
      });
      return { items: items.map((i) => ({ id: i.id, position: i.position })) };
    }

    // Get all items
    const allItems = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
      order: { position: 'ASC' },
    });

    // Reorder
    if (newPosition > oldPosition) {
      // Moving down - shift items between old and new positions up
      for (const i of allItems) {
        if (i.id === itemId) {
          i.position = newPosition;
        } else if (i.position > oldPosition && i.position <= newPosition) {
          i.position -= 1;
        }
      }
    } else {
      // Moving up - shift items between new and old positions down
      for (const i of allItems) {
        if (i.id === itemId) {
          i.position = newPosition;
        } else if (i.position >= newPosition && i.position < oldPosition) {
          i.position += 1;
        }
      }
    }

    // Save all items
    await this.itemRepository.save(allItems);

    // Return updated positions
    const updatedItems = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
      order: { position: 'ASC' },
    });

    return { items: updatedItems.map((i) => ({ id: i.id, position: i.position })) };
  }

  async searchTracks(userId: string, query: string, provider?: Provider) {
    const results: Record<string, unknown[]> = {
      spotify: [],
      soundcloud: [],
    };

    const accounts = await this.providersService.getProviderAccounts(userId);

    for (const account of accounts) {
      if (provider && account.provider !== provider) {
        continue;
      }

      try {
        const adapter = await this.providersService.getAdapter(userId, account.provider);
        const tracks = await adapter.searchTracks(query, { limit: 20 });

        // Store/update tracks in database
        for (const track of tracks) {
          await this.findOrCreateTrack(account.provider, track);
        }

        // Get tracks from database with our IDs
        const dbTracks = await this.trackRepository.find({
          where: {
            provider: account.provider,
            providerTrackId: In(tracks.map((t) => t.id)),
          },
        });

        results[account.provider] = dbTracks.map((t) => ({
          id: t.id,
          provider: t.provider,
          providerTrackId: t.providerTrackId,
          name: t.name,
          artist: t.artist,
          album: t.album,
          durationMs: t.durationMs,
          imageUrl: t.imageUrl,
          isPlayable: t.isPlayable,
        }));
      } catch (error) {
        console.error(`Error searching ${account.provider}:`, error);
      }
    }

    return { results, query };
  }

  async getPlaybackInfo(userId: string, trackId: string) {
    const track = await this.trackRepository.findOne({
      where: { id: trackId },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    try {
      const adapter = await this.providersService.getAdapter(userId, track.provider);
      const playbackInfo = await adapter.getPlaybackInfo(track.providerTrackId);

      return {
        track: {
          id: track.id,
          name: track.name,
          provider: track.provider,
        },
        playback: playbackInfo,
      };
    } catch {
      // Fallback to external URL
      return {
        track: {
          id: track.id,
          name: track.name,
          provider: track.provider,
        },
        playback: {
          type: 'external',
          externalUrl: track.externalUrl,
        },
      };
    }
  }

  private async findOrCreateTrack(
    provider: Provider,
    providerTrack: { id: string; name: string; artist: string | null; album: string | null; durationMs: number | null; isrc: string | null; previewUrl: string | null; externalUrl: string; imageUrl: string | null; isPlayable: boolean },
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

  /**
   * Find potential duplicates based on normalized title, artist, and duration
   */
  async findDuplicates(playlistId: string): Promise<Array<{ items: UnifiedItem[]; reason: string }>> {
    const items = await this.itemRepository.find({
      where: { unifiedPlaylistId: playlistId },
      relations: ['track'],
    });

    const duplicates: Array<{ items: UnifiedItem[]; reason: string }> = [];

    // Group by normalized name + artist
    const byNameArtist = new Map<string, UnifiedItem[]>();
    for (const item of items) {
      const key = this.normalizeString(`${item.track.name}-${item.track.artist}`);
      const existing = byNameArtist.get(key) || [];
      existing.push(item);
      byNameArtist.set(key, existing);
    }

    for (const [, group] of byNameArtist.entries()) {
      if (group.length > 1) {
        duplicates.push({
          items: group,
          reason: 'Same track name and artist',
        });
      }
    }

    // Group by ISRC (if available)
    const byIsrc = new Map<string, UnifiedItem[]>();
    for (const item of items) {
      if (item.track.isrc) {
        const existing = byIsrc.get(item.track.isrc) || [];
        existing.push(item);
        byIsrc.set(item.track.isrc, existing);
      }
    }

    for (const [, group] of byIsrc.entries()) {
      if (group.length > 1) {
        // Avoid adding if already found by name/artist
        const ids = new Set(group.map((i) => i.id));
        const alreadyFound = duplicates.some(
          (d) => d.items.some((i) => ids.has(i.id)),
        );
        if (!alreadyFound) {
          duplicates.push({
            items: group,
            reason: 'Same ISRC code',
          });
        }
      }
    }

    return duplicates;
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
