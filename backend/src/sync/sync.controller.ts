import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, ConflictResolution } from '../database/entities';
import { ResolveConflictDto } from './dto';

@ApiTags('sync')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('pull')
  @ApiOperation({ summary: 'Pull latest data from all connected providers' })
  @ApiResponse({ status: 200, description: 'Sync started' })
  async pull(@CurrentUser() user: User) {
    return this.syncService.pullFromProviders(user.id);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current sync status' })
  @ApiResponse({ status: 200, description: 'Sync status' })
  async getStatus(@CurrentUser() user: User) {
    return this.syncService.getSyncStatus(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get sync history' })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Sync history' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.syncService.getSyncHistory(user.id, page || 1, limit || 20);
  }

  @Get('conflicts')
  @ApiOperation({ summary: 'Get unresolved conflicts' })
  @ApiQuery({ name: 'resolved', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'List of conflicts' })
  async getConflicts(
    @CurrentUser() user: User,
    @Query('resolved') resolved?: boolean,
  ) {
    return this.syncService.getConflicts(user.id, resolved || false);
  }

  @Post('conflicts/:id/resolve')
  @ApiOperation({ summary: 'Resolve a conflict' })
  @ApiResponse({ status: 200, description: 'Conflict resolved' })
  async resolveConflict(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.syncService.resolveConflict(user.id, id, dto.resolution);
  }
}
