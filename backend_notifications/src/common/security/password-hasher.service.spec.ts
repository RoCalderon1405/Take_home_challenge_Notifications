import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PasswordHaserService } from './password-hasher.service';

describe('PasswordHaserService', () => {
  let service: PasswordHaserService;

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    configServiceMock.getOrThrow.mockReturnValue('test-password-pepper');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordHaserService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<PasswordHaserService>(PasswordHaserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should verify a password using the generated hash', async () => {
    const password = 'my-secure-password';

    const hashedPassword = await service.hash(password);

    const isValid = await service.verify(password, hashedPassword);

    expect(isValid).toBe(true);
  });

  it('should return false when the password is incorrect', async () => {
    const password = 'my-secure-password';
    const wrongPassword = 'another-password';

    const hashedPassword = await service.hash(password);

    const isValid = await service.verify(wrongPassword, hashedPassword);

    expect(isValid).toBe(false);
  });

  it('should fail verification when using a different pepper', async () => {
    const password = 'my-secure-password';

    const hashedPassword = await service.hash(password);

    const differentConfigService = {
      getOrThrow: jest.fn().mockReturnValue('different-password-pepper'),
    };

    const moduleWithDifferentPepper = await Test.createTestingModule({
      providers: [
        PasswordHaserService,
        {
          provide: ConfigService,
          useValue: differentConfigService,
        },
      ],
    }).compile();

    const serviceWithDifferentPepper =
      moduleWithDifferentPepper.get<PasswordHaserService>(PasswordHaserService);

    const isValid = await serviceWithDifferentPepper.verify(
      password,
      hashedPassword,
    );

    expect(isValid).toBe(false);
  });

  it('should generate different hashes for the same password', async () => {
    const password = 'my-secure-password';

    const firstHash = await service.hash(password);
    const secondHash = await service.hash(password);

    expect(firstHash).not.toBe(secondHash);
  });
});
