import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpException, Logger } from '@nestjs/common';
import {
  createFixture,
  createPrismaMock,
  FIXTURE_PASSWORD_HASH,
  ids,
  seedPrismaMock,
  type PrismaFixture,
} from '../../test/prisma-mock.js';
import { Prisma } from '../generated/prisma/client.js';
import { MembersService } from './members.service.js';

const acmeAdmin = { tenantId: ids.acme, role: 'ADMIN' } as const;
const acmeMember = { tenantId: ids.acme, role: 'MEMBER' } as const;

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected a rejection');
}

async function httpRejection(promise: Promise<unknown>) {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(HttpException);
  return error as HttpException;
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma ${code}`, {
    code,
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe('MembersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let data: PrismaFixture;
  let service: MembersService;

  function seed(fixture: PrismaFixture = createFixture()) {
    prisma = createPrismaMock();
    data = seedPrismaMock(prisma, fixture);
    service = new MembersService(prisma);
  }

  function roleOf(tenantId: string, userId: string) {
    return data.memberships.find(
      (m) => m.tenantId === tenantId && m.userId === userId,
    )?.role;
  }

  let logSpy: jest.SpiedFunction<Logger['log']>;

  beforeEach(() => {
    seed();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => logSpy.mockRestore());

  describe('list', () => {
    it('queries only the context tenant with an explicit select and order', async () => {
      await service.list(acmeAdmin, ids.alice);

      expect(prisma.tenantUser.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.tenantUser.findMany).toHaveBeenCalledWith({
        where: { tenantId: ids.acme },
        select: {
          role: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
        },
        orderBy: [
          { role: 'asc' },
          { user: { name: 'asc' } },
          { userId: 'asc' },
        ],
      });
    });

    it('returns only the tenant members, admins first, without password hashes', async () => {
      const result = await service.list(acmeAdmin, ids.alice);

      expect(result.members.map((m) => m.userId)).toEqual([ids.alice, ids.bob]);
      const json = JSON.stringify(result);
      expect(json).not.toContain('passwordHash');
      expect(json).not.toContain(FIXTURE_PASSWORD_HASH);
    });

    it('maps the member fields', async () => {
      const result = await service.list(
        { tenantId: ids.umbrella, role: 'ADMIN' },
        ids.dave,
      );

      expect(result.members[1]).toEqual({
        userId: ids.heidi,
        name: 'Heidi Hughes',
        email: 'heidi@example.com',
        role: 'MEMBER',
        status: 'INVITED',
        joinedAt: '2026-10-20T08:08:00.000Z',
        isSelf: false,
        canChangeRole: true,
      });
    });

    it('lets an admin manage every row except their own', async () => {
      const result = await service.list(acmeAdmin, ids.alice);

      expect(result.viewer).toEqual({
        userId: ids.alice,
        role: 'ADMIN',
        canManageRoles: true,
      });
      expect(result.members[0]).toMatchObject({
        userId: ids.alice,
        isSelf: true,
        canChangeRole: false,
      });
      expect(result.members[1]).toMatchObject({
        userId: ids.bob,
        isSelf: false,
        canChangeRole: true,
      });
    });

    it('gives a member a read-only view', async () => {
      const result = await service.list(acmeMember, ids.bob);

      expect(result.viewer).toEqual({
        userId: ids.bob,
        role: 'MEMBER',
        canManageRoles: false,
      });
      expect(result.members.every((m) => !m.canChangeRole)).toBe(true);
    });
  });

  describe('updateRole', () => {
    it('promotes a member through the composite key after locking the tenant', async () => {
      const result = await service.updateRole(
        acmeAdmin,
        ids.alice,
        ids.bob,
        'ADMIN',
      );

      expect(result).toMatchObject({
        userId: ids.bob,
        role: 'ADMIN',
        isSelf: false,
        canChangeRole: true,
      });
      expect(prisma.tenantUser.update).toHaveBeenCalledWith({
        where: { tenantId_userId: { tenantId: ids.acme, userId: ids.bob } },
        data: { role: 'ADMIN' },
        select: expect.objectContaining({ role: true }),
      });
      expect(roleOf(ids.acme, ids.bob)).toBe('ADMIN');
      expect(logSpy).toHaveBeenCalledWith({
        event: 'member.role_changed',
        tenantId: ids.acme,
        actorId: ids.alice,
        userId: ids.bob,
        from: 'MEMBER',
        to: 'ADMIN',
      });

      const lock = prisma.$queryRaw.mock.invocationCallOrder[0];
      expect(lock).toBeLessThan(
        prisma.tenantUser.findUnique.mock.invocationCallOrder[0],
      );
      expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual([ids.acme]);
      expect(prisma.$queryRaw.mock.calls[0][0].join('?')).toContain(
        'FOR NO KEY UPDATE',
      );
    });

    it('re-reads the actor role inside the transaction', async () => {
      await service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN');

      expect(prisma.tenantUser.findUnique).toHaveBeenNthCalledWith(1, {
        where: { tenantId_userId: { tenantId: ids.acme, userId: ids.alice } },
        select: { role: true },
      });
    });

    it('refuses self-demotion before entering a transaction', async () => {
      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.alice, 'MEMBER'),
      );

      expect(error.getStatus()).toBe(409);
      expect(error.getResponse()).toEqual({
        statusCode: 409,
        error: 'Conflict',
        code: 'SELF_DEMOTION_FORBIDDEN',
        message: 'You cannot remove your own admin access',
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('answers 404 for a user of another tenant and writes nothing', async () => {
      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.carol, 'ADMIN'),
      );

      expect(error.getStatus()).toBe(404);
      expect(error.getResponse()).toMatchObject({ code: 'MEMBER_NOT_FOUND' });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
      expect(roleOf(ids.globex, ids.carol)).toBe('MEMBER');
    });

    it('answers 404 for a random user id and writes nothing', async () => {
      const error = await httpRejection(
        service.updateRole(
          acmeAdmin,
          ids.alice,
          '10000000-0000-4000-8000-0000000000ff',
          'ADMIN',
        ),
      );

      expect(error.getResponse()).toMatchObject({ code: 'MEMBER_NOT_FOUND' });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('returns the current member without writing when the role is unchanged', async () => {
      const result = await service.updateRole(
        acmeAdmin,
        ids.alice,
        ids.bob,
        'MEMBER',
      );

      expect(result).toMatchObject({ userId: ids.bob, role: 'MEMBER' });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('lets an admin keep their own role', async () => {
      const result = await service.updateRole(
        acmeAdmin,
        ids.alice,
        ids.alice,
        'ADMIN',
      );

      expect(result).toMatchObject({
        userId: ids.alice,
        role: 'ADMIN',
        isSelf: true,
        canChangeRole: false,
      });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('answers 403 when the actor was demoted before the transaction', async () => {
      prisma.tenantUser.findUnique.mockResolvedValueOnce({ role: 'MEMBER' });

      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      );

      expect(error.getStatus()).toBe(403);
      expect(error.getResponse()).toMatchObject({ code: 'NOT_TENANT_ADMIN' });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('answers 404 when the actor was removed before the transaction', async () => {
      prisma.tenantUser.findUnique.mockResolvedValueOnce(null);

      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      );

      expect(error.getStatus()).toBe(404);
      expect(error.getResponse()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('answers 404 when the tenant row is gone', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      );

      expect(error.getStatus()).toBe(404);
      expect(error.getResponse()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
      expect(prisma.tenantUser.findUnique).not.toHaveBeenCalled();
      expect(prisma.tenantUser.update).not.toHaveBeenCalled();
    });

    it('maps P2025 to 404 MEMBER_NOT_FOUND', async () => {
      prisma.tenantUser.update.mockRejectedValueOnce(prismaError('P2025'));

      const error = await httpRejection(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      );

      expect(error.getStatus()).toBe(404);
      expect(error.getResponse()).toMatchObject({ code: 'MEMBER_NOT_FOUND' });
    });

    it.each(['P2028', 'P2034'])(
      'maps %s to 409 ROLE_CHANGE_CONFLICT',
      async (code) => {
        prisma.$transaction.mockRejectedValueOnce(prismaError(code));

        const error = await httpRejection(
          service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
        );

        expect(error.getStatus()).toBe(409);
        expect(error.getResponse()).toMatchObject({
          code: 'ROLE_CHANGE_CONFLICT',
        });
        expect(JSON.stringify(error.getResponse())).not.toContain('Prisma');
      },
    );

    it('rethrows unexpected errors unchanged', async () => {
      const unexpected = new Error('connection lost');
      prisma.tenantUser.update.mockRejectedValueOnce(unexpected);

      await expect(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      ).rejects.toBe(unexpected);
    });

    it('rethrows unmapped Prisma errors unchanged', async () => {
      const unexpected = prismaError('P2002');
      prisma.tenantUser.update.mockRejectedValueOnce(unexpected);

      await expect(
        service.updateRole(acmeAdmin, ids.alice, ids.bob, 'ADMIN'),
      ).rejects.toBe(unexpected);
    });

    describe('last-admin invariant (defense in depth)', () => {
      beforeEach(() => {
        const fixture = createFixture();
        const bob = fixture.memberships.find(
          (m) => m.tenantId === ids.acme && m.userId === ids.bob,
        );
        bob!.role = 'ADMIN';
        seed(fixture);
      });

      it('refuses to demote an admin when the count says only one admin is left', async () => {
        prisma.tenantUser.count.mockResolvedValueOnce(1);

        const error = await httpRejection(
          service.updateRole(acmeAdmin, ids.alice, ids.bob, 'MEMBER'),
        );

        expect(error.getStatus()).toBe(409);
        expect(error.getResponse()).toMatchObject({
          code: 'LAST_ADMIN_REQUIRED',
        });
        expect(prisma.tenantUser.count).toHaveBeenCalledWith({
          where: { tenantId: ids.acme, role: 'ADMIN' },
        });
        expect(prisma.tenantUser.update).not.toHaveBeenCalled();
        expect(roleOf(ids.acme, ids.bob)).toBe('ADMIN');
      });

      it('demotes another admin when two admins remain', async () => {
        prisma.tenantUser.count.mockResolvedValueOnce(2);

        const result = await service.updateRole(
          acmeAdmin,
          ids.alice,
          ids.bob,
          'MEMBER',
        );

        expect(result).toMatchObject({ userId: ids.bob, role: 'MEMBER' });
        expect(prisma.tenantUser.update).toHaveBeenCalledTimes(1);
        expect(roleOf(ids.acme, ids.bob)).toBe('MEMBER');
      });
    });
  });
});
