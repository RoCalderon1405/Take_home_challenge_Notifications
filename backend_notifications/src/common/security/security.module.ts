import { Module } from '@nestjs/common';
import { PasswordHaserService } from './password-hasher.service';

@Module({
  providers: [PasswordHaserService],
  exports: [PasswordHaserService],
})
export class SecurityModule {}
