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

import {
  ApiCreateUser,
  ApiDeleteUser,
  ApiGetUser,
  ApiGetUsers,
  ApiUsersController,
} from './docs/users-swagger.decorators';
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
@ApiUsersController()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user account.
   *
   * @param createUserDto Data required to create the account.
   * @returns The created user without sensitive authentication data.
   */
  @Post()
  @ApiCreateUser()
  create(
    @Body()
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Retrieves all registered users.
   *
   * @returns All registered users.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiGetUsers()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  /**
   * Retrieves a user by its unique identifier.
   *
   * @param id UUID of the user to retrieve.
   * @returns The matching user.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiGetUser()
  findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<UserModel> {
    return this.usersService.findOneById(id);
  }

  /**
   * Deletes a user account by its unique identifier.
   *
   * @param id UUID of the user to delete.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteUser()
  async remove(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<void> {
    await this.usersService.remove(id);
  }
}
