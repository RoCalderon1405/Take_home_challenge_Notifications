import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@app/generated/prisma/client';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordHaserService } from '@app/common/security/password-hasher.service';
import { UserRole } from './models';

describe('UsersService', () => {
  let service: UsersService;

  /**
   * Mock de PrismaService.
   *
   * Evita conectarnos a una base de datos real durante los unit tests.
   * Cada método es una función controlada por Jest para poder definir
   * qué debe devolver y verificar cómo fue llamada.
   */
  const prismaMock = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  /**
   * Mock del servicio encargado del manejo de contraseñas.
   *
   * No queremos ejecutar Argon2 realmente en los tests de UsersService,
   * porque aquí estamos probando UsersService, no el algoritmo de hashing.
   */
  const passwordHasherMock = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  /**
   * Se ejecuta antes de cada test.
   *
   * Crea un módulo de NestJS aislado e inyecta los mocks en lugar
   * de PrismaService y PasswordHaserService reales.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: PasswordHaserService,
          useValue: passwordHasherMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    /**
     * Limpia el historial de llamadas de todos los mocks.
     *
     * Así cada test comienza de forma independiente y una prueba
     * no afecta los resultados de otra.
     */
    jest.clearAllMocks();
  });

  /**
   * Verifica que NestJS pueda crear correctamente UsersService
   * con todas sus dependencias mockeadas.
   */
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Verifica que al crear un usuario:
   *
   * 1. La contraseña original sea enviada al servicio de hashing.
   * 2. Prisma reciba el hash generado.
   * 3. La contraseña en texto plano nunca sea almacenada.
   */
  it('should create a user with hashed password', async () => {
    // Arrange
    const createUserDto = {
      email: 'test@gmail.com',
      password: 'my-secure-password',
    };

    passwordHasherMock.hash.mockResolvedValue('hashed-password');

    prismaMock.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    await service.create(createUserDto);

    // Assert
    expect(passwordHasherMock.hash).toHaveBeenCalledWith('my-secure-password');

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@gmail.com',
        passwordHash: 'hashed-password',
      },
      omit: {
        passwordHash: true,
      },
    });
  });

  /**
   * Verifica que el usuario creado sea devuelto sin información sensible.
   *
   * passwordHash puede existir en la base de datos,
   * pero nunca debe formar parte de la respuesta pública.
   */
  it('should return the created user without passwordHash', async () => {
    // Arrange
    const createUserDto = {
      email: 'test@gmail.com',
      password: 'my-secure-password',
    };

    const createdAt = new Date();
    const updatedAt = new Date();

    passwordHasherMock.hash.mockResolvedValue('hashed-password');

    prismaMock.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });

    // Act
    const result = await service.create(createUserDto);

    // Assert
    expect(result).toEqual({
      id: 'user-id',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });

    expect(result).not.toHaveProperty('passwordHash');
  });

  /**
   * Verifica el manejo de una violación de restricción UNIQUE.
   *
   * Prisma utiliza el código P2002 cuando se intenta insertar
   * un valor duplicado en una columna con restricción única,
   * como el email del usuario.
   *
   * UsersService debe traducir ese error de persistencia
   * a una ConflictException de NestJS (HTTP 409).
   */
  it('should throw ConflictException when email already exists', async () => {
    // Arrange
    const createUserDto = {
      email: 'test@gmail.com',
      password: 'my-secure-password',
    };

    passwordHasherMock.hash.mockResolvedValue('hashed-password');

    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.9.0',
        meta: {
          target: ['email'],
        },
      }),
    );

    // Act + Assert
    await expect(service.create(createUserDto)).rejects.toThrow(
      ConflictException,
    );
  });

  /**
   * Verifica que findOneById:
   *
   * 1. Busque exactamente por el ID recibido.
   * 2. Omita passwordHash.
   * 3. Devuelva correctamente el usuario encontrado.
   */
  it('should return a user by id', async () => {
    // Arrange
    const createdAt = new Date();
    const updatedAt = new Date();

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });

    // Act
    const result = await service.findOneById('user-id');

    // Assert
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'user-id',
      },
      omit: {
        passwordHash: true,
      },
    });

    expect(result).toEqual({
      id: 'user-id',
      email: 'test@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });
  });

  /**
   * Verifica que findOneById lance NotFoundException
   * cuando Prisma no encuentra ningún usuario.
   */
  it('should throw NotFoundException when user does not exist', async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Act + Assert
    await expect(service.findOneById('user-id')).rejects.toThrow(
      NotFoundException,
    );

    await expect(service.findOneById('user-id')).rejects.toThrow(
      'User with id: user-id not found',
    );
  });

  /**
   * Verifica que findAll:
   *
   * 1. Solicite todos los usuarios.
   * 2. Omita passwordHash.
   * 3. Devuelva todos los resultados correctamente mapeados.
   */
  it('should return all users without passwordHash', async () => {
    // Arrange
    const createdAt = new Date();
    const updatedAt = new Date();

    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'user1@gmail.com',
        status: 'ACTIVE',
        role: UserRole.USER,
        createdAt,
        updatedAt,
      },
      {
        id: 'user-2',
        email: 'user2@gmail.com',
        status: 'INACTIVE',
        role: UserRole.USER,
        createdAt,
        updatedAt,
      },
    ]);

    // Act
    const result = await service.findAll();

    // Assert
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      omit: {
        passwordHash: true,
      },
    });

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: 'user-1',
      email: 'user1@gmail.com',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });

    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  /**
   * Verifica el método interno utilizado por autenticación.
   *
   * A diferencia de los endpoints públicos, Auth sí necesita
   * passwordHash para poder comparar la contraseña recibida
   * con el hash almacenado.
   *
   * Este objeto no debe enviarse directamente al cliente.
   */
  it('should return user with passwordHash for authentication', async () => {
    // Arrange
    const createdAt = new Date();
    const updatedAt = new Date();

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'test@gmail.com',
      passwordHash: 'hashed-password',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });

    // Act
    const result = await service.findOneByEmailForAuth('test@gmail.com');

    // Assert
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'test@gmail.com',
      },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual({
      id: 'user-id',
      email: 'test@gmail.com',
      passwordHash: 'hashed-password',
      status: 'ACTIVE',
      role: UserRole.USER,
      createdAt,
      updatedAt,
    });
  });
});
