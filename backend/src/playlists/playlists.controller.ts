import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlaylistsService } from './playlists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Provider } from '../database/entities';

@ApiTags('playlists')
@Controller('playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all playlists from connected providers' })
  @ApiQuery({ name: 'provider', enum: Provider, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of playlists' })
  async getPlaylists(
    @CurrentUser() user: User,
    @Query('provider') provider?: Provider,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.playlistsService.getPlaylists(
      user.id,
      provider,
      page || 1,
      limit || 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playlist details with tracks' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Playlist with tracks' })
  async getPlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.playlistsService.getPlaylistWithTracks(
      user.id,
      id,
      page || 1,
      limit || 50,
    );
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync playlist with provider' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncPlaylist(@CurrentUser() user: User, @Param('id') id: string) {
    return this.playlistsService.syncPlaylist(user.id, id);
  }

  @Post('sync/:provider')
  @ApiOperation({ summary: 'Sync all playlists from a provider' })
  @ApiResponse({ status: 200, description: 'Sync completed' })
  async syncAllPlaylists(
    @CurrentUser() user: User,
    @Param('provider') provider: Provider,
  ) {
    return this.playlistsService.syncAllPlaylists(user.id, provider);
  }
}
