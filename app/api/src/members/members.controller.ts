import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { TenantRole } from '../generated/prisma/enums.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import type { TenantContext } from '../tenancy/tenant-context.js';
import {
  RequireTenantRole,
  TenantMemberGuard,
} from '../tenancy/tenant-member.guard.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { MembersService } from './members.service.js';

const userIdPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      code: 'VALIDATION_FAILED',
      message: ['userId must be a UUID'],
    }),
});

@Controller('tenants/:tenantId/members')
@UseGuards(AuthGuard, TenantMemberGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(
    @CurrentTenant() tenant: TenantContext,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.members.list(tenant, request.user.sub);
  }

  @Patch(':userId')
  @RequireTenantRole(TenantRole.ADMIN)
  updateRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', userIdPipe) userId: string,
    @Body() body: UpdateMemberRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.members.updateRole(tenant, request.user.sub, userId, body.role);
  }
}
