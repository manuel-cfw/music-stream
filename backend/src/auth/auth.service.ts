import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshToken, User } from '../database/entities';
import { RegisterDto, LoginDto, MagicLinkDto } from './dto';

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName || null,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  async sendMagicLink(dto: MagicLinkDto): Promise<void> {
    let user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Create user without password
      user = await this.usersService.create({
        email: dto.email,
        passwordHash: null,
        displayName: null,
      });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to user
    await this.userRepository.update(user.id, {
      magicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
    });

    // TODO: Send email with magic link
    // For development, log the link
    const magicLinkUrl = `${this.configService.get('APP_URL')}/auth/magic-link?token=${token}`;
    console.log(`Magic link for ${dto.email}: ${magicLinkUrl}`);
  }

  async verifyMagicLink(token: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.userRepository.findOne({
      where: { magicLinkToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    if (!user.magicLinkExpiresAt || user.magicLinkExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    // Clear magic link token and mark email as verified
    await this.userRepository.update(user.id, {
      magicLinkToken: null,
      magicLinkExpiresAt: null,
      emailVerified: true,
    });

    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revoked: false },
      relations: ['user'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.refreshTokenRepository.update(storedToken.id, {
      revoked: true,
      revokedAt: new Date(),
    });

    // Generate new tokens
    return this.generateTokens(storedToken.user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.refreshTokenRepository.update(
      { tokenHash },
      { revoked: true, revokedAt: new Date() },
    );
  }

  async validateUser(payload: TokenPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    // Store refresh token
    const refreshTokenEntity = this.refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
