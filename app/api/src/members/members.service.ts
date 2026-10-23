import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { TenantRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TenantContext } from '../tenancy/tenant-context.js';
import {
  notTenantAdmin,
  tenantNotFound,
} from '../tenancy/tenant-member.guard.js';

const memberSelect = {
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, status: true } },
} satisfies Prisma.TenantUserSelect;

type MemberRow = Prisma.TenantUserGetPayload<{ select: typeof memberSelect }>;

function memberNotFound() {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    code: 'MEMBER_NOT_FOUND',
    message: 'Member not found in this tenant',
  });
}

function conflict(code: string, message: string) {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code,
    message,
  });
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: TenantContext, viewerId: string) {
    const canManageRoles = ctx.role === TenantRole.ADMIN;
    const rows = await this.prisma.tenantUser.findMany({
      where: { tenantId: ctx.tenantId },
      select: memberSelect,
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }, { userId: 'asc' }],
    });

    return {
      viewer: { userId: viewerId, role: ctx.role, canManageRoles },
      members: rows.map((row) => toMemberDto(row, viewerId, canManageRoles)),
    };
  }

  async updateRole(
    ctx: TenantContext,
    actorId: string,
    userId: string,
    role: TenantRole,
  ) {
    if (userId === actorId && role !== TenantRole.ADMIN) {
      throw conflict(
        'SELF_DEMOTION_FORBIDDEN',
        'You cannot remove your own admin access',
      );
    }

    const { tenantId } = ctx;
    const where = { tenantId_userId: { tenantId, userId } };

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const locked = await tx.$queryRaw<
            unknown[]
          >`SELECT 1 FROM "tenants" WHERE "id" = ${tenantId} FOR NO KEY UPDATE`;
          if (locked.length === 0) {
            throw tenantNotFound();
          }

          const actor = await tx.tenantUser.findUnique({
            where: { tenantId_userId: { tenantId, userId: actorId } },
            select: { role: true },
          });
          if (!actor) {
            throw tenantNotFound();
          }
          if (actor.role !== TenantRole.ADMIN) {
            throw notTenantAdmin();
          }

          const target = await tx.tenantUser.findUnique({
            where,
            select: memberSelect,
          });
          if (!target) {
            throw memberNotFound();
          }
          if (target.role === role) {
            return { row: target, from: target.role, changed: false };
          }

          if (target.role === TenantRole.ADMIN) {
            const admins = await tx.tenantUser.count({
              where: { tenantId, role: TenantRole.ADMIN },
            });
            if (admins <= 1) {
              throw conflict(
                'LAST_ADMIN_REQUIRED',
                'A tenant needs at least one admin',
              );
            }
          }

          const row = await tx.tenantUser.update({
            where,
            data: { role },
            select: memberSelect,
          });
          return { row, from: target.role, changed: true };
        },
        { maxWait: 2000, timeout: 5000 },
      );

      if (result.changed) {
        this.logger.log({
          event: 'member.role_changed',
          tenantId,
          actorId,
          userId,
          from: result.from,
          to: role,
        });
      }
      return toMemberDto(result.row, actorId, true);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw memberNotFound();
        }
        if (error.code === 'P2028' || error.code === 'P2034') {
          throw conflict(
            'ROLE_CHANGE_CONFLICT',
            'The role was changed concurrently, please try again',
          );
        }
      }
      throw error;
    }
  }
}

function toMemberDto(
  row: MemberRow,
  viewerId: string,
  canManageRoles: boolean,
) {
  const isSelf = row.user.id === viewerId;
  return {
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.role,
    status: row.user.status,
    joinedAt: row.createdAt.toISOString(),
    isSelf,
    canChangeRole: canManageRoles && !isSelf,
  };
}
