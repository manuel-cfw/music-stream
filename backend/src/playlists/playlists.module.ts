import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { ProvidersModule } from '../providers/providers.module';
import { Playlist, PlaylistItem, Track } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Playlist, PlaylistItem, Track]),
    ProvidersModule,
  ],
  providers: [PlaylistsService],
  controllers: [PlaylistsController],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
