import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { TenantRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TenantContext } from './tenant-context.js';

export const RequireTenantRole = Reflector.createDecorator<TenantRole>();

export type TenantRequest = AuthenticatedRequest & { tenant?: TenantContext };

export function tenantNotFound() {
  return new NotFoundException({
    statusCode: 404,
    error: 'Not Found',
    code: 'TENANT_NOT_FOUND',
    message: 'Tenant not found',
  });
}

export function notTenantAdmin() {
  return new ForbiddenException({
    statusCode: 403,
    error: 'Forbidden',
    code: 'NOT_TENANT_ADMIN',
    message: 'Only tenant admins can change roles',
  });
}

@Injectable()
export class TenantMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.params?.tenantId;
    if (typeof tenantId !== 'string' || !isUUID(tenantId)) {
      throw tenantNotFound();
    }

    const membership = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: request.user.sub } },
      select: { role: true },
    });
    if (!membership) {
      throw tenantNotFound();
    }

    const required = this.reflector.getAllAndOverride(RequireTenantRole, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required === TenantRole.ADMIN && membership.role !== TenantRole.ADMIN) {
      throw notTenantAdmin();
    }

    request.tenant = { tenantId, role: membership.role };
    return true;
  }
}
