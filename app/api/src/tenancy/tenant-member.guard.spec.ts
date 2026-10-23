import { describe, expect, it, beforeEach } from '@jest/globals';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  createFixture,
  createPrismaMock,
  ids,
  seedPrismaMock,
} from '../../test/prisma-mock.js';
import { MembersController } from '../members/members.controller.js';
import {
  TenantMemberGuard,
  type TenantRequest,
} from './tenant-member.guard.js';

type Handler = 'list' | 'updateRole';

function request(
  userId: string,
  tenantId: string,
  extra: Partial<TenantRequest> = {},
): TenantRequest {
  return {
    params: { tenantId },
    headers: {},
    user: { sub: userId, username: 'someone' },
    ...extra,
  } as unknown as TenantRequest;
}

function contextFor(req: TenantRequest, handler: Handler): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => MembersController.prototype[handler],
    getClass: () => MembersController,
  } as unknown as ExecutionContext;
}

async function rejection(promise: Promise<unknown>): Promise<HttpException> {
  try {
    await promise;
  } catch (error) {
    return error as HttpException;
  }
  throw new Error('Expected the guard to reject');
}

describe('TenantMemberGuard', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let guard: TenantMemberGuard;

  beforeEach(() => {
    prisma = createPrismaMock();
    seedPrismaMock(prisma, createFixture());
    guard = new TenantMemberGuard(prisma, new Reflector());
  });

  it('answers 404 for a malformed tenant id without querying the database', async () => {
    const error = await rejection(
      guard.canActivate(contextFor(request(ids.alice, 'acme'), 'list')),
    );

    expect(error.getStatus()).toBe(404);
    expect(error.getResponse()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'TENANT_NOT_FOUND',
      message: 'Tenant not found',
    });
    expect(prisma.tenantUser.findUnique).not.toHaveBeenCalled();
  });

  it('answers 404 for a non-member and looks up the membership by the token subject', async () => {
    const error = await rejection(
      guard.canActivate(contextFor(request(ids.carol, ids.acme), 'list')),
    );

    expect(error.getStatus()).toBe(404);
    expect(error.getResponse()).toMatchObject({ code: 'TENANT_NOT_FOUND' });
    expect(prisma.tenantUser.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: ids.acme, userId: ids.carol } },
      select: { role: true },
    });
  });

  it('gives an unknown tenant the same 404 body as a malformed id', async () => {
    const unknown = await rejection(
      guard.canActivate(
        contextFor(
          request(ids.alice, '30000000-0000-4000-8000-000000000000'),
          'list',
        ),
      ),
    );
    const malformed = await rejection(
      guard.canActivate(contextFor(request(ids.alice, 'not-a-uuid'), 'list')),
    );

    expect(unknown.getResponse()).toEqual(malformed.getResponse());
  });

  it('lets a member read and attaches the tenant context from the database', async () => {
    const req = request(ids.bob, ids.acme);

    await expect(guard.canActivate(contextFor(req, 'list'))).resolves.toBe(
      true,
    );
    expect(req.tenant).toEqual({ tenantId: ids.acme, role: 'MEMBER' });
  });

  it('answers 403 when a member calls an admin-only handler', async () => {
    const req = request(ids.bob, ids.acme);
    const error = await rejection(
      guard.canActivate(contextFor(req, 'updateRole')),
    );

    expect(error.getStatus()).toBe(403);
    expect(error.getResponse()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'NOT_TENANT_ADMIN',
      message: 'Only tenant admins can change roles',
    });
    expect(req.tenant).toBeUndefined();
  });

  it('lets an admin call an admin-only handler', async () => {
    const req = request(ids.alice, ids.acme);

    await expect(
      guard.canActivate(contextFor(req, 'updateRole')),
    ).resolves.toBe(true);
    expect(req.tenant).toEqual({ tenantId: ids.acme, role: 'ADMIN' });
  });

  it('ignores a legacy token claim that says the user is an admin', async () => {
    const req = request(ids.bob, ids.acme, {
      user: {
        sub: ids.bob,
        username: 'bob',
        tenants: [{ id: ids.acme, role: 'ADMIN' }],
      } as unknown as TenantRequest['user'],
    });
    const error = await rejection(
      guard.canActivate(contextFor(req, 'updateRole')),
    );

    expect(error.getStatus()).toBe(403);
  });

  it('ignores a spoofed x-tenant-id header and checks the path tenant', async () => {
    const req = request(ids.carol, ids.acme, {
      headers: { 'x-tenant-id': ids.globex },
    } as Partial<TenantRequest>);
    const error = await rejection(guard.canActivate(contextFor(req, 'list')));

    expect(error.getStatus()).toBe(404);
    expect(prisma.tenantUser.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.tenantUser.findUnique).toHaveBeenCalledWith({
      where: { tenantId_userId: { tenantId: ids.acme, userId: ids.carol } },
      select: { role: true },
    });
  });
});
