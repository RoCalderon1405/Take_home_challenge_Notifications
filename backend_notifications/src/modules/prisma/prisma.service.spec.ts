import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    configServiceMock.getOrThrow.mockReturnValue(
      'postgresql://postgres:postgres@localhost:5432/notifications',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});