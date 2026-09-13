import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  NotificationChannelCode,
  type NotificationChannelCode as NotificationChannelCodeType,
  NotificationStatus,
  type NotificationStatus as NotificationStatusType,
} from '../models';

export const NotificationSortBy = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  TITLE: 'title',
  STATUS: 'status',
  CHANNEL: 'channel',
  RECIPIENT: 'recipient',
} as const;

export type NotificationSortBy =
  (typeof NotificationSortBy)[keyof typeof NotificationSortBy];

export const SortDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

/**
 * Query parameters supported by the paginated notification list endpoint.
 *
 * Pagination uses a one-based page number because it maps naturally to UI
 * data grids. Sorting is restricted to a known allow-list so persistence
 * details cannot be selected dynamically by clients.
 */
export class ListNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsIn(Object.values(NotificationSortBy))
  sortBy: NotificationSortBy = NotificationSortBy.CREATED_AT;

  @IsOptional()
  @IsIn(Object.values(SortDirection))
  sortDirection: SortDirection = SortDirection.DESC;

  @IsOptional()
  @IsIn(Object.values(NotificationStatus))
  status?: NotificationStatusType;

  @IsOptional()
  @IsIn(Object.values(NotificationChannelCode))
  channel?: NotificationChannelCodeType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @MaxLength(200)
  search?: string;
}
