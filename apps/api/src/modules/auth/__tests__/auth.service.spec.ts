import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { GoogleAuthService } from '../strategies/google.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: Record<string, any>;
  let mockRedis: Record<string, any>;
  let mockJwt: Record<string, any>;

  beforeEach(async () => {
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
        { provide: GoogleAuthService, useValue: { verifyGoogleToken: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerInput = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        phone: '9876543210',
        role: 'GUEST',
        isActive: true,
        password: 'hashed-password',
      });

      const result = await service.register(registerInput);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
          }),
        }),
      );
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing',
        email: 'test@example.com',
      });

      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject duplicate phone', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing',
        email: 'other@example.com',
        phone: '9876543210',
      });

      await expect(service.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: true,
        role: 'GUEST',
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login(loginInput);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should reject non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject deactivated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        isActive: false,
      });

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestOTP', () => {
    it('should generate and store OTP', async () => {
      const result = await service.requestOTP({ phone: '9876543210' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('OTP sent');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp:9876543210',
        expect.any(String),
        300,
      );
    });
  });

  describe('verifyOTP', () => {
    it('should reject expired/missing OTP', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.verifyOTP({ phone: '9876543210', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject wrong OTP', async () => {
      mockRedis.get.mockResolvedValue('654321');

      await expect(
        service.verifyOTP({ phone: '9876543210', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should verify correct OTP and create user if new', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-new',
        phone: '9876543210',
        role: 'GUEST',
        isActive: true,
        phoneVerified: true,
      });

      const result = await service.verifyOTP({
        phone: '9876543210',
        otp: '123456',
      });

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('otp:9876543210');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should reject incorrect current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'newpass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should change password and revoke tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: 'hashed-old',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-1');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      const result = await service.logout('user-1');

      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('refresh:user-1');
    });
  });
});
