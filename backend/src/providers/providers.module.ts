import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { TokenService } from './token.service';
import { OAuthStateService } from './oauth-state.service';
import { SpotifyAdapter } from './adapters/spotify.adapter';
import { SoundCloudAdapter } from './adapters/soundcloud.adapter';
import { ProviderAccount, ProviderToken } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderAccount, ProviderToken]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [ProvidersService, TokenService, OAuthStateService, SpotifyAdapter, SoundCloudAdapter],
  controllers: [ProvidersController],
  exports: [ProvidersService, TokenService, SpotifyAdapter, SoundCloudAdapter],
})
export class ProvidersModule {}
