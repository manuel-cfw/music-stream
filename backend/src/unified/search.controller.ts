import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UnifiedService } from './unified.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Provider } from '../database/entities';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly unifiedService: UnifiedService) {}

  @Get('tracks')
  @ApiOperation({ summary: 'Search tracks across all connected providers' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'provider', enum: Provider, required: false })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchTracks(
    @CurrentUser() user: User,
    @Query('q') query: string,
    @Query('provider') provider?: Provider,
  ) {
    return this.unifiedService.searchTracks(user.id, query, provider);
  }
}
