import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SyncRun,
  SyncType,
  SyncStatus,
  Conflict,
  ConflictType,
  ConflictResolution,
  Provider,
} from '../database/entities';
import { ProvidersService } from '../providers/providers.service';
import { PlaylistsService } from '../playlists/playlists.service';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(SyncRun)
    private readonly syncRunRepository: Repository<SyncRun>,
    @InjectRepository(Conflict)
    private readonly conflictRepository: Repository<Conflict>,
    private readonly providersService: ProvidersService,
    private readonly playlistsService: PlaylistsService,
  ) {}

  async pullFromProviders(userId: string) {
    // Create sync run
    const syncRun = this.syncRunRepository.create({
      userId,
      syncType: SyncType.PULL,
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });
    await this.syncRunRepository.save(syncRun);

    try {
      const accounts = await this.providersService.getProviderAccounts(userId);
      let totalProcessed = 0;
      let totalAdded = 0;
      let totalUpdated = 0;

      for (const account of accounts) {
        try {
          const result = await this.playlistsService.syncAllPlaylists(
            userId,
            account.provider as Provider,
          );
          totalProcessed += result.total;
          totalAdded += result.playlistsAdded;
          totalUpdated += result.playlistsUpdated;
        } catch (error) {
          console.error(`Error syncing ${account.provider}:`, error);
          // Create conflict for failed provider sync
          const conflict = this.conflictRepository.create({
            syncRunId: syncRun.id,
            conflictType: ConflictType.SYNC_FAILED,
            details: {
              provider: account.provider,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          await this.conflictRepository.save(conflict);
        }
      }

      // Update sync run
      syncRun.status = SyncStatus.COMPLETED;
      syncRun.completedAt = new Date();
      syncRun.itemsProcessed = totalProcessed;
      syncRun.itemsAdded = totalAdded;
      syncRun.itemsUpdated = totalUpdated;
      await this.syncRunRepository.save(syncRun);

      return {
        syncRun: {
          id: syncRun.id,
          type: syncRun.syncType,
          status: syncRun.status,
        },
      };
    } catch (error) {
      // Mark sync as failed
      syncRun.status = SyncStatus.FAILED;
      syncRun.completedAt = new Date();
      syncRun.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.syncRunRepository.save(syncRun);
      throw error;
    }
  }

  async getSyncStatus(userId: string) {
    // Get active syncs
    const activeSyncs = await this.syncRunRepository.find({
      where: {
        userId,
        status: SyncStatus.RUNNING,
      },
      order: { startedAt: 'DESC' },
    });

    // Get last completed sync
    const lastSync = await this.syncRunRepository.findOne({
      where: {
        userId,
        status: SyncStatus.COMPLETED,
      },
      order: { completedAt: 'DESC' },
    });

    return {
      activeSyncs: activeSyncs.map((s) => ({
        id: s.id,
        type: s.syncType,
        status: s.status,
        startedAt: s.startedAt,
      })),
      lastSync: lastSync
        ? {
            id: lastSync.id,
            type: lastSync.syncType,
            status: lastSync.status,
            completedAt: lastSync.completedAt,
          }
        : null,
    };
  }

  async getSyncHistory(userId: string, page: number = 1, limit: number = 20) {
    const [syncRuns, total] = await this.syncRunRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      syncRuns: syncRuns.map((s) => ({
        id: s.id,
        type: s.syncType,
        status: s.status,
        itemsProcessed: s.itemsProcessed,
        itemsAdded: s.itemsAdded,
        itemsUpdated: s.itemsUpdated,
        itemsRemoved: s.itemsRemoved,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        errorMessage: s.errorMessage,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConflicts(userId: string, resolved: boolean = false) {
    const conflicts = await this.conflictRepository
      .createQueryBuilder('conflict')
      .innerJoin('conflict.syncRun', 'syncRun')
      .leftJoinAndSelect('conflict.unifiedItem', 'unifiedItem')
      .leftJoinAndSelect('unifiedItem.track', 'track')
      .leftJoinAndSelect('unifiedItem.unifiedPlaylist', 'unifiedPlaylist')
      .where('syncRun.userId = :userId', { userId })
      .andWhere('conflict.resolved = :resolved', { resolved })
      .orderBy('conflict.createdAt', 'DESC')
      .getMany();

    return {
      conflicts: conflicts.map((c) => ({
        id: c.id,
        type: c.conflictType,
        details: c.details,
        resolved: c.resolved,
        resolution: c.resolution,
        unifiedPlaylist: c.unifiedItem?.unifiedPlaylist
          ? {
              id: c.unifiedItem.unifiedPlaylist.id,
              name: c.unifiedItem.unifiedPlaylist.name,
            }
          : null,
        track: c.unifiedItem?.track
          ? {
              id: c.unifiedItem.track.id,
              name: c.unifiedItem.track.name,
              artist: c.unifiedItem.track.artist,
            }
          : null,
        createdAt: c.createdAt,
      })),
    };
  }

  async resolveConflict(
    userId: string,
    conflictId: string,
    resolution: ConflictResolution,
  ) {
    const conflict = await this.conflictRepository
      .createQueryBuilder('conflict')
      .innerJoin('conflict.syncRun', 'syncRun')
      .where('conflict.id = :conflictId', { conflictId })
      .andWhere('syncRun.userId = :userId', { userId })
      .getOne();

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    conflict.resolved = true;
    conflict.resolvedAt = new Date();
    conflict.resolution = resolution;
    await this.conflictRepository.save(conflict);

    // TODO: Apply resolution based on type
    // For now, just mark as resolved

    return {
      conflict: {
        id: conflict.id,
        resolved: conflict.resolved,
        resolution: conflict.resolution,
        resolvedAt: conflict.resolvedAt,
      },
    };
  }
}
