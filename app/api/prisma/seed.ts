import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import {
  PrismaClient,
  TenantRole,
  UserStatus,
} from '../src/generated/prisma/client.js';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = '123456';

const tenants = [
  { slug: 'acme', name: 'Acme Corporation' },
  { slug: 'globex', name: 'Globex Industries' },
  { slug: 'initech', name: 'Initech' },
  { slug: 'umbrella', name: 'Umbrella Holdings' },
  { slug: 'stark', name: 'Stark Enterprises' },
  { slug: 'wayne', name: 'Wayne Logistics' },
  { slug: 'hooli', name: 'Hooli' },
];

const { ADMIN, MEMBER } = TenantRole;
const { ACTIVE, INVITED, SUSPENDED } = UserStatus;

const users: {
  username: string;
  name: string;
  status: UserStatus;
  memberships: { tenant: string; role: TenantRole }[];
}[] = [
  {
    username: 'alice',
    name: 'Alice Anderson',
    status: ACTIVE,
    memberships: [
      { tenant: 'acme', role: ADMIN },
      { tenant: 'globex', role: ADMIN },
    ],
  },
  {
    username: 'bob',
    name: 'Bob Brown',
    status: ACTIVE,
    memberships: [
      { tenant: 'initech', role: ADMIN },
      { tenant: 'acme', role: MEMBER },
    ],
  },
  {
    username: 'carol',
    name: 'Carol Clark',
    status: ACTIVE,
    memberships: [
      { tenant: 'globex', role: MEMBER },
      { tenant: 'initech', role: MEMBER },
    ],
  },
  {
    username: 'dave',
    name: 'Dave Davis',
    status: ACTIVE,
    memberships: [{ tenant: 'umbrella', role: ADMIN }],
  },
  {
    username: 'erin',
    name: 'Erin Evans',
    status: ACTIVE,
    memberships: [{ tenant: 'stark', role: ADMIN }],
  },
  {
    username: 'frank',
    name: 'Frank Foster',
    status: ACTIVE,
    memberships: [{ tenant: 'wayne', role: ADMIN }],
  },
  {
    username: 'grace',
    name: 'Grace Green',
    status: ACTIVE,
    memberships: [{ tenant: 'hooli', role: ADMIN }],
  },
  {
    username: 'heidi',
    name: 'Heidi Hughes',
    status: INVITED,
    memberships: [{ tenant: 'umbrella', role: MEMBER }],
  },
  {
    username: 'ivan',
    name: 'Ivan Iverson',
    status: SUSPENDED,
    memberships: [{ tenant: 'stark', role: MEMBER }],
  },
  {
    username: 'judy',
    name: 'Judy Johnson',
    status: ACTIVE,
    memberships: [{ tenant: 'hooli', role: MEMBER }],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [tenantsBefore, usersBefore] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
  ]);

  const tenantIds = new Map<string, string>();
  for (const tenant of tenants) {
    const { id } = await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: { name: tenant.name },
      create: tenant,
    });
    tenantIds.set(tenant.slug, id);
  }

  for (const { username, name, status, memberships } of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { name, status, passwordHash },
      create: {
        username,
        name,
        status,
        email: `${username}@example.com`,
        passwordHash,
      },
    });
    await prisma.tenantUser.deleteMany({ where: { userId: user.id } });
    await prisma.tenantUser.createMany({
      data: memberships.map(({ tenant, role }) => ({
        userId: user.id,
        tenantId: tenantIds.get(tenant)!,
        role,
      })),
    });
  }
  const [tenantsAfter, usersAfter, memberships] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.tenantUser.count(),
  ]);
  console.log(
    `Tenants: ${tenantsAfter} total (${tenantsAfter - tenantsBefore} new)\n` +
      `Users: ${usersAfter} total (${usersAfter - usersBefore} new)\n` +
      `Memberships: ${memberships} total\n` +
      `Password for every seeded user: ${PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
