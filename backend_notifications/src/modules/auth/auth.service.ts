import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';
import { LoginDto } from './request';
import { UserModel } from '../users/models';
import { UserMapper } from '../users/mappers';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UsersService,
    private readonly _paswordHasherService: PasswordHaserService,
  ) {}

  async validateCredentials(loginDto: LoginDto): Promise<UserModel> {
    const { email, password } = loginDto;

    const user = await this._userService.findOneByEmailForAuth(email);

    if (!user) throw new UnauthorizedException(`Invalid credentials`);

    const isPasswordValid = await this._paswordHasherService.verify(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException(`Invalid credentials`);

    return UserMapper.toModel(user);
  }
}
