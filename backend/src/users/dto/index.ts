import { IsString, MaxLength, IsOptional, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Theme } from '../../database/entities/user-settings.entity';
import { Provider } from '../../database/entities/provider-account.entity';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: Theme })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @ApiPropertyOptional({ enum: Provider })
  @IsOptional()
  @IsEnum(Provider)
  defaultProvider?: Provider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSyncEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  syncIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
