import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '@app/common/authorization/decorators/roles.decorator';
import { RolesGuard } from '@app/common/authorization/guards/roles.guard';

import { JwtAuthGuard } from '../auth/guards';

import { UserModel, UserRole } from './models';
import { CreateUserDto } from './request';
import { UserResponseDto } from './response';
import { UsersService } from './users.service';

/**
 * Handles HTTP operations related to user accounts.
 *
 * Public account registration is exposed through POST /users.
 * Administrative user-management operations require JWT authentication
 * and the ADMIN role.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user account.
   *
   * This endpoint is intentionally public because it is used for
   * account registration. Newly created users receive the default
   * application role configured at the persistence layer.
   *
   * @param createUserDto Data required to create the account.
   * @returns The created user without sensitive authentication data.
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Retrieves all registered users.
   *
   * Access is restricted to authenticated administrators.
   * Password hashes and other authentication secrets are not exposed.
   *
   * @returns All registered users.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  /**
   * Retrieves a user by its unique identifier.
   *
   * The identifier is validated as a UUID before reaching the service.
   * Access is restricted to authenticated administrators.
   *
   * @param id UUID of the user to retrieve.
   * @returns The matching user.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserModel> {
    return this.usersService.findOneById(id);
  }

  /**
   * Deletes a user account by its unique identifier.
   *
   * The identifier is validated as a UUID before reaching the service.
   * Only authenticated administrators are allowed to delete users.
   *
   * A successful deletion returns HTTP 204 with no response body.
   *
   * @param id UUID of the user to delete.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
