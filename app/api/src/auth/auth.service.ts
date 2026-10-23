import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.guard.js';
import type { LoginDto } from './login.dto.js';

const UNKNOWN_USER_HASH =
  '$2b$10$0.aB/EEDQol1Yi/aUMXIU.nzyzGbtvSL5bLFnSqCkILtR1fUPjyDO';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ username, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, passwordHash: true },
    });
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? UNKNOWN_USER_HASH,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = { sub: user.id, username: user.username };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        tenants: {
          select: {
            role: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { tenant: { name: 'asc' } },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const { tenants, ...profile } = user;
    return {
      ...profile,
      tenants: tenants.map(({ role, tenant }) => ({ ...tenant, role })),
    };
  }
}
