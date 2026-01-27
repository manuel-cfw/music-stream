import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedService } from './unified.service';
import { UnifiedController } from './unified.controller';
import { SearchController } from './search.controller';
import { ProvidersModule } from '../providers/providers.module';
import { UnifiedPlaylist, UnifiedItem, Track } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnifiedPlaylist, UnifiedItem, Track]),
    ProvidersModule,
  ],
  providers: [UnifiedService],
  controllers: [UnifiedController, SearchController],
  exports: [UnifiedService],
})
export class UnifiedModule {}
