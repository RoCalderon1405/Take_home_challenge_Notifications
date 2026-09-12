jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(): boolean {
        return true;
      }
    },
}));

import {
  type ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
  const configServiceMock = {
    get: jest.fn<boolean | undefined, [string]>(),
  };

  let guard: GoogleAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new GoogleAuthGuard(configServiceMock as unknown as ConfigService);
  });

  it('should reject Google OAuth when it is disabled', () => {
    configServiceMock.get.mockReturnValue(false);

    expect(() => guard.canActivate({} as ExecutionContext)).toThrow(
      ServiceUnavailableException,
    );
  });

  it('should allow Passport to continue when Google OAuth is enabled', () => {
    configServiceMock.get.mockReturnValue(true);

    const result = guard.canActivate({} as ExecutionContext);

    expect(result).toBe(true);
  });

  it('should treat a missing configuration value as disabled', () => {
    configServiceMock.get.mockReturnValue(undefined);

    expect(() => guard.canActivate({} as ExecutionContext)).toThrow(
      ServiceUnavailableException,
    );
  });
});
