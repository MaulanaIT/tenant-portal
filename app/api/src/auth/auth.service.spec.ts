import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createPrismaMock, ids } from '../../test/prisma-mock.js';
import { AuthService } from './auth.service.js';

describe('AuthService.login', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuthService;
  let passwordHash: string;

  beforeEach(async () => {
    prisma = createPrismaMock();
    service = new AuthService(prisma, new JwtService({ secret: 'test' }));
    passwordHash = await bcrypt.hash('123456', 4);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks a password hash for an unknown username too, so timing does not reveal it', async () => {
    prisma.user.findUnique.mockImplementation(() => Promise.resolve(null));
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(
      service.login({ username: 'nosuchuser', password: 'wrong' }),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid username or password'),
    );
    expect(compare).toHaveBeenCalledTimes(1);
  });

  it('gives a wrong password the same error as an unknown username', async () => {
    prisma.user.findUnique.mockImplementation(() =>
      Promise.resolve({ id: ids.alice, username: 'alice', passwordHash }),
    );

    await expect(
      service.login({ username: 'alice', password: 'wrong' }),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid username or password'),
    );
  });

  it('signs a token with only sub and username for a valid login', async () => {
    prisma.user.findUnique.mockImplementation(() =>
      Promise.resolve({ id: ids.alice, username: 'alice', passwordHash }),
    );

    const { accessToken } = await service.login({
      username: 'alice',
      password: '123456',
    });
    const payload = await new JwtService({ secret: 'test' }).verifyAsync<
      Record<string, unknown>
    >(accessToken);

    expect(payload).toMatchObject({ sub: ids.alice, username: 'alice' });
    expect(payload).not.toHaveProperty('tenants');
  });
});
