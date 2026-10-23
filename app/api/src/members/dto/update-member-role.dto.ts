import { IsEnum } from 'class-validator';
import { TenantRole } from '../../generated/prisma/enums.js';

export class UpdateMemberRoleDto {
  @IsEnum(TenantRole, { message: 'role must be one of: ADMIN, MEMBER' })
  role!: TenantRole;
}
