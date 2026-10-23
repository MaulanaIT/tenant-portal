import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { TenantContext } from './tenant-context.js';
import type { TenantRequest } from './tenant-member.guard.js';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenant) {
      throw new InternalServerErrorException();
    }
    return request.tenant;
  },
);
