import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UnifiedService } from './unified.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { CreatePlaylistDto, UpdatePlaylistDto, AddItemsDto, ReorderItemsDto } from './dto';

@ApiTags('unified')
@Controller('unified-playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UnifiedController {
  constructor(private readonly unifiedService: UnifiedService) {}

  @Get()
  @ApiOperation({ summary: 'Get all unified playlists' })
  @ApiResponse({ status: 200, description: 'List of unified playlists' })
  async getPlaylists(@CurrentUser() user: User) {
    return this.unifiedService.getPlaylists(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new unified playlist' })
  @ApiResponse({ status: 201, description: 'Playlist created' })
  async createPlaylist(@CurrentUser() user: User, @Body() dto: CreatePlaylistDto) {
    return this.unifiedService.createPlaylist(user.id, dto.name, dto.description);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get unified playlist with items' })
  @ApiResponse({ status: 200, description: 'Playlist with items' })
  async getPlaylist(@CurrentUser() user: User, @Param('id') id: string) {
    return this.unifiedService.getPlaylist(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update unified playlist' })
  @ApiResponse({ status: 200, description: 'Playlist updated' })
  async updatePlaylist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.unifiedService.updatePlaylist(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete unified playlist' })
  @ApiResponse({ status: 204, description: 'Playlist deleted' })
  async deletePlaylist(@CurrentUser() user: User, @Param('id') id: string) {
    await this.unifiedService.deletePlaylist(user.id, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add tracks to unified playlist' })
  @ApiResponse({ status: 200, description: 'Items added' })
  async addItems(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddItemsDto,
  ) {
    return this.unifiedService.addItems(user.id, id, dto.trackIds, dto.position);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from unified playlist' })
  @ApiResponse({ status: 204, description: 'Item removed' })
  async removeItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    await this.unifiedService.removeItem(user.id, id, itemId);
  }

  @Put(':id/items/reorder')
  @ApiOperation({ summary: 'Reorder items in unified playlist' })
  @ApiResponse({ status: 200, description: 'Items reordered' })
  async reorderItems(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.unifiedService.reorderItems(user.id, id, dto.itemId, dto.newPosition);
  }

  @Get(':id/duplicates')
  @ApiOperation({ summary: 'Find duplicate tracks in unified playlist' })
  @ApiResponse({ status: 200, description: 'List of potential duplicates' })
  async findDuplicates(@CurrentUser() user: User, @Param('id') id: string) {
    // First verify user owns this playlist
    await this.unifiedService.getPlaylist(user.id, id);
    const duplicates = await this.unifiedService.findDuplicates(id);
    return { duplicates };
  }
}
