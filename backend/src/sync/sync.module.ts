import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ProvidersModule } from '../providers/providers.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { SyncRun, Conflict, UnifiedItem, UnifiedPlaylist } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncRun, Conflict, UnifiedItem, UnifiedPlaylist]),
    ProvidersModule,
    PlaylistsModule,
  ],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
