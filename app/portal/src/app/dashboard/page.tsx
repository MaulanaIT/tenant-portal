import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser, type Tenant } from "@/lib/api";
import { getDashboardData, type DashboardData } from "@/lib/sample-data";
import { AppHeader, AppHeaderSkeleton } from "./app-header";

export const metadata: Metadata = { title: "Dashboard · Tenant Portal" };

const card =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Dashboard({
  searchParams,
}: Pick<PageProps<"/dashboard">, "searchParams">) {
  const [user, { tenant: slug }] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  const tenant =
    user.tenants.find((t) => t.slug === slug) ?? user.tenants[0];

  return (
    <>
      <AppHeader user={user} tenant={tenant ?? null} active="overview" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {tenant ? (
          <TenantDashboard tenant={tenant} data={getDashboardData(tenant.slug)} />
        ) : (
          <div className={card}>
            <h1 className="text-lg font-semibold">No tenants yet</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Ask an admin to add you to a tenant.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

function TenantDashboard({
  tenant,
  data,
}: {
  tenant: Tenant;
  data: DashboardData;
}) {
  const isAdmin = tenant.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {data.plan} plan · Signed in as{" "}
            <span className="font-medium">{isAdmin ? "Admin" : "Member"}</span>
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          Sample data
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((stat) => (
          <div key={stat.label} className={card}>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p
              className={`mt-1 text-xs font-medium ${stat.up ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}
            >
              {stat.change} vs last month
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="font-semibold">Projects</h2>
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.projects.map((project) => (
              <li key={project.name} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-zinc-500">{project.owner}</p>
                </div>
                <StatusBadge status={project.status} />
                <div className="hidden w-32 sm:block">
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
                  {project.progress}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={card}>
          <h2 className="font-semibold">Recent activity</h2>
          <ul className="mt-4 space-y-4">
            {data.activity.map((item) => (
              <li key={`${item.who}-${item.what}`} className="text-sm">
                <p>
                  <span className="font-medium">{item.who}</span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">{item.what}</span>
                </p>
                <p className="text-xs text-zinc-400">{item.when}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {isAdmin ? (
        <section className={card}>
          <h2 className="font-semibold">Admin</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Only admins of {tenant.name} can see this.
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-zinc-500">Seats</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {data.seats.used} / {data.seats.total}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Pending invites</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {data.pendingInvites}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Billing plan</dt>
              <dd className="mt-1 text-lg font-semibold">{data.plan}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">
          You&apos;re a member of {tenant.name}. Admin settings are hidden.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DashboardData["projects"][number]["status"] }) {
  const styles = {
    "On track": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    "At risk": "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
    Done: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  }[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <AppHeaderSkeleton />
      <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 px-4 py-8">
        <div className="h-8 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </>
  );
}
