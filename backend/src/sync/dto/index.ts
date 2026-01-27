import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConflictResolution } from '../../database/entities';

export class ResolveConflictDto {
  @ApiProperty({ enum: ConflictResolution })
  @IsEnum(ConflictResolution)
  resolution: ConflictResolution;
}
