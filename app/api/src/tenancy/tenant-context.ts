import type { TenantRole } from '../generated/prisma/enums.js';

export type TenantContext = { tenantId: string; role: TenantRole };
