import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHaserService {
  private readonly _pepper: string;

  constructor(private readonly configService: ConfigService) {
    this._pepper = configService.getOrThrow<string>('PASSWORD_PEPPER');
  }

  async hash(password: string): Promise<string> {
    const pepperedPassword = this.applyPepper(password);

    return await argon2.hash(pepperedPassword, {
      type: argon2.argon2id,
    });
  }

  async verify(password: string, hashedPassword: string): Promise<boolean> {
    const result = await argon2.verify(hashedPassword, password);

    return result;
  }

  private applyPepper(password: string): string {
    return createHmac('sha256', this._pepper)
      .update(password, 'utf8')
      .digest('base64url');
  }
}
