import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Invalid email format' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(16, { message: 'Password must be at least 16 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;
}
