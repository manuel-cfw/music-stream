import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../database/entities';
import { UpdateProfileDto, UpdateSettingsDto } from './dto';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser() user: User) {
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    const updatedUser = await this.usersService.update(user.id, {
      displayName: dto.displayName,
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
      },
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({ status: 200, description: 'User settings' })
  async getSettings(@CurrentUser() user: User) {
    const settings = await this.usersService.getSettings(user.id);
    return { settings };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateSettingsDto) {
    const settings = await this.usersService.updateSettings(user.id, dto);
    return { settings };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all user data (GDPR compliance)' })
  @ApiResponse({ status: 200, description: 'User data export' })
  async exportData(@CurrentUser() user: User) {
    return this.usersService.exportUserData(user.id);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user account and all data' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async deleteAccount(@CurrentUser() user: User) {
    await this.usersService.deleteUserWithAllData(user.id);
  }
}
