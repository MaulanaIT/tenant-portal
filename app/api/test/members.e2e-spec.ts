import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  createFixture,
  createPrismaMock,
  FIXTURE_PASSWORD_HASH,
  ids,
  seedPrismaMock,
} from './prisma-mock.js';

type UserKey = 'alice' | 'bob' | 'carol' | 'dave' | 'frank';

const membersOf = (tenantId: string) => `/tenants/${tenantId}/members`;

describe('Members API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;

  const token = (user: UserKey) =>
    app.get(JwtService).signAsync({ sub: ids[user], username: user });

  async function get(user: UserKey, tenantId: string) {
    return request(app.getHttpServer())
      .get(membersOf(tenantId))
      .set('Authorization', `Bearer ${await token(user)}`);
  }

  async function patch(
    user: UserKey,
    tenantId: string,
    userId: string,
    body: object,
  ) {
    return request(app.getHttpServer())
      .patch(`${membersOf(tenantId)}/${userId}`)
      .set('Authorization', `Bearer ${await token(user)}`)
      .send(body);
  }

  function expectNoWrite() {
    expect(prisma.tenantUser.update).not.toHaveBeenCalled();
  }

  function expectRejectedBeforeService() {
    expectNoWrite();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  }

  beforeEach(async () => {
    prisma = createPrismaMock();
    seedPrismaMock(prisma, createFixture());

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it('rejects a request without a token', async () => {
      await request(app.getHttpServer()).get(membersOf(ids.acme)).expect(401);
      await request(app.getHttpServer())
        .patch(`${membersOf(ids.acme)}/${ids.bob}`)
        .send({ role: 'ADMIN' })
        .expect(401);
      expectRejectedBeforeService();
      expect(prisma.tenantUser.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a malformed Bearer header', async () => {
      await request(app.getHttpServer())
        .patch(`${membersOf(ids.acme)}/${ids.bob}`)
        .set('Authorization', 'Bearer')
        .send({ role: 'ADMIN' })
        .expect(401);
      await request(app.getHttpServer())
        .get(membersOf(ids.acme))
        .set('Authorization', `Token ${await token('alice')}`)
        .expect(401);
      expectRejectedBeforeService();
    });

    it('rejects a token signed with another secret', async () => {
      const forged = await new JwtService({ secret: 'other' }).signAsync({
        sub: ids.alice,
        username: 'alice',
      });

      await request(app.getHttpServer())
        .patch(`${membersOf(ids.acme)}/${ids.bob}`)
        .set('Authorization', `Bearer ${forged}`)
        .send({ role: 'ADMIN' })
        .expect(401);
      expectRejectedBeforeService();
    });
  });

  describe('GET /tenants/:tenantId/members', () => {
    it('lists exactly the tenant members for an admin, without password hashes', async () => {
      const response = await get('alice', ids.acme);

      expect(response.status).toBe(200);
      expect(
        response.body.members.map((m: { userId: string }) => m.userId),
      ).toEqual([ids.alice, ids.bob]);
      expect(response.body.viewer).toEqual({
        userId: ids.alice,
        role: 'ADMIN',
        canManageRoles: true,
      });
      expect(response.text).not.toContain('passwordHash');
      expect(response.text).not.toContain(FIXTURE_PASSWORD_HASH);
    });

    it('gives a member a read-only list', async () => {
      const response = await get('bob', ids.acme);

      expect(response.status).toBe(200);
      expect(response.body.viewer.canManageRoles).toBe(false);
      expect(
        response.body.members.every(
          (m: { canChangeRole: boolean }) => m.canChangeRole === false,
        ),
      ).toBe(true);
    });

    it('reads the role per tenant from the database', async () => {
      const response = await get('bob', ids.initech);

      expect(response.status).toBe(200);
      expect(response.body.viewer.canManageRoles).toBe(true);
      expect(
        response.body.members.find(
          (m: { userId: string }) => m.userId === ids.carol,
        ),
      ).toMatchObject({ role: 'MEMBER', canChangeRole: true });
    });

    it('returns the only-you shape for a single-member tenant', async () => {
      const response = await get('frank', ids.wayne);

      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0]).toMatchObject({
        userId: ids.frank,
        isSelf: true,
        canChangeRole: false,
      });
    });

    it('answers 404 to a non-member and the same body for a malformed tenant id', async () => {
      const notMember = await get('carol', ids.acme);
      const malformed = await get('carol', 'acme');

      expect(notMember.status).toBe(404);
      expect(notMember.body).toEqual({
        statusCode: 404,
        error: 'Not Found',
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
      });
      expect(malformed.status).toBe(404);
      expect(malformed.body).toEqual(notMember.body);
    });

    it('ignores the x-tenant-id header and serves the path tenant only', async () => {
      const response = await request(app.getHttpServer())
        .get(membersOf(ids.umbrella))
        .set('Authorization', `Bearer ${await token('dave')}`)
        .set('x-tenant-id', ids.acme)
        .expect(200);

      expect(response.body.members).toEqual([
        expect.objectContaining({ userId: ids.dave, status: 'ACTIVE' }),
        expect.objectContaining({ userId: ids.heidi, status: 'INVITED' }),
      ]);
      expect(prisma.tenantUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: ids.umbrella } }),
      );
    });
  });

  describe('PATCH /tenants/:tenantId/members/:userId', () => {
    it('promotes a member and the change is visible on the next read', async () => {
      const response = await patch('alice', ids.acme, ids.bob, {
        role: 'ADMIN',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: ids.bob,
        role: 'ADMIN',
        isSelf: false,
        canChangeRole: true,
      });
      expect(response.text).not.toContain('passwordHash');

      const after = await get('alice', ids.acme);
      expect(
        after.body.members.find((m: { userId: string }) => m.userId === ids.bob)
          .role,
      ).toBe('ADMIN');
    });

    it('cannot reach another tenant through the x-tenant-id header', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${membersOf(ids.initech)}/${ids.carol}`)
        .set('Authorization', `Bearer ${await token('alice')}`)
        .set('x-tenant-id', ids.globex)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('TENANT_NOT_FOUND');
      expectRejectedBeforeService();

      const initech = await get('bob', ids.initech);
      expect(
        initech.body.members.find(
          (m: { userId: string }) => m.userId === ids.carol,
        ).role,
      ).toBe('MEMBER');
    });

    it('answers 403 when a member changes a role', async () => {
      const response = await patch('bob', ids.acme, ids.alice, {
        role: 'MEMBER',
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        code: 'NOT_TENANT_ADMIN',
        message: 'Only tenant admins can change roles',
      });
      expectRejectedBeforeService();
    });

    it.each([
      ['an unsupported role', { role: 'OWNER' }],
      ['a missing role', {}],
      ['an extra field', { role: 'MEMBER', tenantId: 'x' }],
    ])('answers 400 for %s', async (_label, body) => {
      const response = await patch('alice', ids.acme, ids.bob, body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
      });
      expect(Array.isArray(response.body.message)).toBe(true);
      expectRejectedBeforeService();
    });

    it('answers 400 for a malformed user id', async () => {
      const response = await patch('alice', ids.acme, 'bob', {
        role: 'ADMIN',
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_FAILED',
        message: ['userId must be a UUID'],
      });
      expectRejectedBeforeService();
    });

    it('answers 400 for a malformed JSON body', async () => {
      const response = await request(app.getHttpServer())
        .patch(`${membersOf(ids.acme)}/${ids.bob}`)
        .set('Authorization', `Bearer ${await token('alice')}`)
        .set('Content-Type', 'application/json')
        .send('{"role":');

      expect(response.status).toBe(400);
      expectRejectedBeforeService();
    });

    it('answers 200 without a write when the role is unchanged', async () => {
      const response = await patch('alice', ids.acme, ids.bob, {
        role: 'MEMBER',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ userId: ids.bob, role: 'MEMBER' });
      expectNoWrite();
    });

    it('answers 403 to a member before validating an unsupported role', async () => {
      const response = await patch('bob', ids.acme, ids.alice, {
        role: 'OWNER',
      });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('NOT_TENANT_ADMIN');
      expectRejectedBeforeService();
    });

    it('answers 409 ROLE_CHANGE_CONFLICT without Prisma details when the transaction conflicts', async () => {
      prisma.$transaction.mockImplementationOnce(() =>
        Promise.reject(
          new Prisma.PrismaClientKnownRequestError('Prisma P2034 deadlock', {
            code: 'P2034',
            clientVersion: Prisma.prismaVersion.client,
          }),
        ),
      );

      const response = await patch('alice', ids.acme, ids.bob, {
        role: 'ADMIN',
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        code: 'ROLE_CHANGE_CONFLICT',
        message: 'The role was changed concurrently, please try again',
      });
      expect(response.text).not.toContain('P2034');
      expect(response.text).not.toContain('Prisma');
    });

    it('answers 409 when an admin demotes themselves', async () => {
      const response = await patch('alice', ids.acme, ids.alice, {
        role: 'MEMBER',
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        code: 'SELF_DEMOTION_FORBIDDEN',
        message: 'You cannot remove your own admin access',
      });
      expectRejectedBeforeService();
    });

    it('answers 404 for a user who belongs to another tenant', async () => {
      const response = await patch('alice', ids.acme, ids.carol, {
        role: 'ADMIN',
      });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        code: 'MEMBER_NOT_FOUND',
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expectNoWrite();
    });
  });
});
