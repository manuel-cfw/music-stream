import { IsString, IsOptional, IsArray, IsNumber, Min, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlaylistDto {
  @ApiProperty({ example: 'My Unified Playlist' })
  @IsString()
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional({ example: 'A mix of Spotify and SoundCloud tracks' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdatePlaylistDto {
  @ApiPropertyOptional({ example: 'Updated Playlist Name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class AddItemsDto {
  @ApiProperty({ example: ['track-uuid-1', 'track-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  trackIds: string[];

  @ApiPropertyOptional({ example: 0, description: 'Position to insert tracks at' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class ReorderItemsDto {
  @ApiProperty({ example: 'item-uuid' })
  @IsString()
  itemId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  newPosition: number;
}
