import { jest } from '@jest/globals';
import { Prisma } from '../src/generated/prisma/client.js';
import type { TenantRole, UserStatus } from '../src/generated/prisma/enums.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

type AnyMock = jest.Mock<(...args: any[]) => any>;

const modelMethods = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
] as const;

type MockModel = Record<(typeof modelMethods)[number], AnyMock>;

function mockModel(): MockModel {
  return Object.fromEntries(
    modelMethods.map((method) => [method, jest.fn()]),
  ) as MockModel;
}

type PrismaMock = {
  user: MockModel;
  tenant: MockModel;
  tenantUser: MockModel;
  $transaction: AnyMock;
  $queryRaw: AnyMock;
  $executeRaw: AnyMock;
};

export function createPrismaMock(): PrismaService & PrismaMock {
  const prisma: PrismaMock = {
    user: mockModel(),
    tenant: mockModel(),
    tenantUser: mockModel(),
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as unknown[]),
    ),
    $queryRaw: jest.fn(() => Promise.resolve([{ '?column?': 1 }])),
    $executeRaw: jest.fn(() => Promise.resolve(0)),
  };
  return prisma as unknown as PrismaService & PrismaMock;
}

type FixtureUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  status: UserStatus;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type FixtureTenant = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type FixtureMembership = {
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: Date;
};

export type PrismaFixture = {
  users: FixtureUser[];
  tenants: FixtureTenant[];
  memberships: FixtureMembership[];
};

export const ids = {
  alice: '10000000-0000-4000-8000-000000000001',
  bob: '10000000-0000-4000-8000-000000000002',
  carol: '10000000-0000-4000-8000-000000000003',
  dave: '10000000-0000-4000-8000-000000000004',
  frank: '10000000-0000-4000-8000-000000000006',
  heidi: '10000000-0000-4000-8000-000000000008',
  acme: '20000000-0000-4000-8000-000000000001',
  globex: '20000000-0000-4000-8000-000000000002',
  initech: '20000000-0000-4000-8000-000000000003',
  umbrella: '20000000-0000-4000-8000-000000000004',
  wayne: '20000000-0000-4000-8000-000000000006',
} as const;

export const FIXTURE_PASSWORD_HASH =
  '$2b$10$fixturefixturefixturefixtureOu1bXzQJx0nYJ9Wq8e3nFvC6Q2p.';

const created = new Date('2026-10-20T08:00:00.000Z');

function user(
  key: keyof typeof ids,
  name: string,
  status: UserStatus = 'ACTIVE',
): FixtureUser {
  return {
    id: ids[key],
    username: key,
    name,
    email: `${key}@example.com`,
    status,
    passwordHash: FIXTURE_PASSWORD_HASH,
    createdAt: created,
    updatedAt: created,
  };
}

function tenant(key: keyof typeof ids, name: string): FixtureTenant {
  return {
    id: ids[key],
    slug: key,
    name,
    createdAt: created,
    updatedAt: created,
  };
}

function membership(
  tenantKey: keyof typeof ids,
  userKey: keyof typeof ids,
  role: TenantRole,
  minute: number,
): FixtureMembership {
  return {
    tenantId: ids[tenantKey],
    userId: ids[userKey],
    role,
    createdAt: new Date(created.getTime() + minute * 60_000),
  };
}

export function createFixture(): PrismaFixture {
  return {
    users: [
      user('alice', 'Alice Anderson'),
      user('bob', 'Bob Brown'),
      user('carol', 'Carol Clark'),
      user('dave', 'Dave Davis'),
      user('frank', 'Frank Foster'),
      user('heidi', 'Heidi Hughes', 'INVITED'),
    ],
    tenants: [
      tenant('acme', 'Acme Corporation'),
      tenant('globex', 'Globex Industries'),
      tenant('initech', 'Initech'),
      tenant('umbrella', 'Umbrella Holdings'),
      tenant('wayne', 'Wayne Logistics'),
    ],
    memberships: [
      membership('acme', 'alice', 'ADMIN', 1),
      membership('acme', 'bob', 'MEMBER', 2),
      membership('globex', 'alice', 'ADMIN', 3),
      membership('globex', 'carol', 'MEMBER', 4),
      membership('initech', 'bob', 'ADMIN', 5),
      membership('initech', 'carol', 'MEMBER', 6),
      membership('umbrella', 'dave', 'ADMIN', 7),
      membership('umbrella', 'heidi', 'MEMBER', 8),
      membership('wayne', 'frank', 'ADMIN', 9),
    ],
  };
}

type Select = Record<string, unknown>;
type Where = {
  tenantId?: string;
  userId?: string;
  role?: TenantRole;
  tenantId_userId?: { tenantId: string; userId: string };
};
type OrderBy = Record<string, unknown>;

export function seedPrismaMock(
  prisma: PrismaService & PrismaMock,
  fixture: PrismaFixture,
): PrismaFixture {
  const data = structuredClone(fixture);

  const related = (row: FixtureMembership, key: string) => {
    if (key === 'user') {
      return data.users.find((u) => u.id === row.userId);
    }
    if (key === 'tenant') {
      return data.tenants.find((t) => t.id === row.tenantId);
    }
    return undefined;
  };

  const pick = (
    source: Record<string, unknown>,
    select: Select | undefined,
    resolve: (key: string) => Record<string, unknown> | undefined,
  ): Record<string, unknown> => {
    if (!select) {
      return structuredClone(source);
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(select)) {
      if (!value) {
        continue;
      }
      if (typeof value === 'object' && 'select' in value) {
        const nested = resolve(key);
        out[key] = nested
          ? pick(nested, (value as { select: Select }).select, () => undefined)
          : null;
      } else {
        out[key] = structuredClone(source[key]);
      }
    }
    return out;
  };

  const shape = (row: FixtureMembership, select?: Select) =>
    pick(row, select, (key) => related(row, key));

  const matches = (row: FixtureMembership, where: Where = {}) => {
    if (where.tenantId_userId) {
      return (
        row.tenantId === where.tenantId_userId.tenantId &&
        row.userId === where.tenantId_userId.userId
      );
    }
    return (
      (where.tenantId === undefined || row.tenantId === where.tenantId) &&
      (where.userId === undefined || row.userId === where.userId) &&
      (where.role === undefined || row.role === where.role)
    );
  };

  const asText = (value: unknown) => {
    if (typeof value === 'string') {
      return value;
    }
    return value instanceof Date ? value.toISOString() : '';
  };

  const sortValue = (row: FixtureMembership, order: OrderBy) => {
    const [key, direction] = Object.entries(order)[0];
    if (typeof direction === 'object' && direction !== null) {
      const [nestedKey, nestedDirection] = Object.entries(direction)[0];
      const nested = related(row, key) as Record<string, unknown> | undefined;
      return {
        value: asText(nested?.[nestedKey]),
        direction: nestedDirection,
      };
    }
    return {
      value: asText((row as unknown as Record<string, unknown>)[key]),
      direction,
    };
  };

  const sort = (rows: FixtureMembership[], orderBy?: OrderBy | OrderBy[]) => {
    const orders = orderBy
      ? Array.isArray(orderBy)
        ? orderBy
        : [orderBy]
      : [];
    return [...rows].sort((a, b) => {
      for (const order of orders) {
        const left = sortValue(a, order);
        const right = sortValue(b, order);
        const result = left.value.localeCompare(right.value, 'en');
        if (result !== 0) {
          return left.direction === 'desc' ? -result : result;
        }
      }
      return 0;
    });
  };

  prisma.tenantUser.findUnique.mockImplementation(
    (args: { where: Where; select?: Select }) => {
      const row = data.memberships.find((m) => matches(m, args.where));
      return Promise.resolve(row ? shape(row, args.select) : null);
    },
  );

  prisma.tenantUser.findMany.mockImplementation(
    (
      args: {
        where?: Where;
        select?: Select;
        orderBy?: OrderBy | OrderBy[];
      } = {},
    ) => {
      const rows = sort(
        data.memberships.filter((m) => matches(m, args.where)),
        args.orderBy,
      );
      return Promise.resolve(rows.map((row) => shape(row, args.select)));
    },
  );

  prisma.tenantUser.count.mockImplementation((args: { where?: Where } = {}) =>
    Promise.resolve(
      data.memberships.filter((m) => matches(m, args.where)).length,
    ),
  );

  prisma.tenantUser.update.mockImplementation(
    (args: {
      where: Where;
      data: Partial<FixtureMembership>;
      select?: Select;
    }) => {
      const row = data.memberships.find((m) => matches(m, args.where));
      if (!row) {
        return Promise.reject(
          new Prisma.PrismaClientKnownRequestError('Record not found', {
            code: 'P2025',
            clientVersion: Prisma.prismaVersion.client,
          }),
        );
      }
      Object.assign(row, args.data);
      return Promise.resolve(shape(row, args.select));
    },
  );

  prisma.$queryRaw.mockImplementation(
    (_strings: TemplateStringsArray, ...values: unknown[]) =>
      Promise.resolve(
        data.tenants.some((t) => t.id === values[0]) ? [{ '?column?': 1 }] : [],
      ),
  );

  return data;
}
