import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Provider } from '../database/entities';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Store OAuth states temporarily (in production, use Redis)
const oauthStates = new Map<string, { userId: string; timestamp: number }>();

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of available providers and connection status' })
  @ApiResponse({ status: 200, description: 'Provider status list' })
  async getProviders(@CurrentUser() user: User) {
    return this.providersService.getProviderStatus(user.id);
  }

  @Get(':provider/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate OAuth flow for a provider' })
  @ApiParam({ name: 'provider', enum: Provider })
  @ApiResponse({ status: 302, description: 'Redirects to provider OAuth page' })
  async connectProvider(
    @CurrentUser() user: User,
    @Param('provider') provider: Provider,
    @Res() res: Response,
  ) {
    if (!Object.values(Provider).includes(provider)) {
      throw new BadRequestException('Invalid provider');
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, { userId: user.id, timestamp: Date.now() });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of oauthStates.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        oauthStates.delete(key);
      }
    }

    const authUrl = this.providersService.getOAuthUrl(provider, state);
    res.redirect(authUrl);
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'OAuth callback handler' })
  @ApiParam({ name: 'provider', enum: Provider })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with status' })
  async handleCallback(
    @Param('provider') provider: Provider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('APP_URL');

    if (error) {
      return res.redirect(`${appUrl}/providers?error=${encodeURIComponent(error)}`);
    }

    // Verify state
    const storedState = oauthStates.get(state);
    if (!storedState) {
      return res.redirect(`${appUrl}/providers?error=invalid_state`);
    }

    oauthStates.delete(state);

    try {
      await this.providersService.handleOAuthCallback(provider, code, storedState.userId);
      return res.redirect(`${appUrl}/providers?success=${provider}`);
    } catch (err) {
      console.error('OAuth callback error:', err);
      return res.redirect(`${appUrl}/providers?error=callback_failed`);
    }
  }

  @Delete(':provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect a provider account' })
  @ApiParam({ name: 'provider', enum: Provider })
  @ApiResponse({ status: 200, description: 'Provider disconnected' })
  async disconnectProvider(@CurrentUser() user: User, @Param('provider') provider: Provider) {
    if (!Object.values(Provider).includes(provider)) {
      throw new BadRequestException('Invalid provider');
    }

    await this.providersService.disconnectProvider(user.id, provider);
    return { message: 'Provider disconnected successfully' };
  }
}
