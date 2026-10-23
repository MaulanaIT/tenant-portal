import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CurrentUser, Tenant } from "@/lib/members-types";
import { SignOutButton } from "./sign-out-button";
import { TenantSwitcher } from "./tenant-switcher";

type ActivePage = "overview" | "members";

const NAV_ITEMS: { key: ActivePage; label: string; path: string }[] = [
  { key: "overview", label: "Overview", path: "/dashboard" },
  { key: "members", label: "Members", path: "/dashboard/members" },
];

function MainNav({
  tenant,
  active,
  className,
  linkClassName,
}: {
  tenant: Tenant | null;
  active: ActivePage;
  className: string;
  linkClassName: string;
}) {
  const query = tenant ? `?tenant=${encodeURIComponent(tenant.slug)}` : "";

  return (
    <nav aria-label="Main" className={className}>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={`${item.path}${query}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center rounded-md px-3 font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
              linkClassName,
              isActive
                ? "bg-muted text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppHeader({
  user,
  tenant,
  active,
}: {
  user: CurrentUser;
  tenant: Tenant | null;
  active: ActivePage;
}) {
  return (
    <header className="border-b bg-background text-sm text-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-auto items-center gap-3">
          <span
            role="img"
            aria-label="Tenant Portal"
            className="flex size-8 flex-none items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
          >
            T
          </span>
          {user.tenants.length > 0 && (
            <TenantSwitcher
              tenants={user.tenants}
              activeSlug={tenant?.slug ?? null}
            />
          )}
          <MainNav
            tenant={tenant}
            active={active}
            className="ml-3 hidden items-center gap-1 sm:flex"
            linkClassName="h-9"
          />
        </div>
        <div className="flex flex-none items-center gap-3">
          <span className="hidden items-baseline gap-1.5 whitespace-nowrap sm:flex">
            <span className="font-medium">{user.name}</span>
            <span className="text-muted-foreground">@{user.username}</span>
          </span>
          <SignOutButton />
        </div>
      </div>
      <MainNav
        tenant={tenant}
        active={active}
        className="mx-auto flex max-w-6xl items-center gap-1 px-4 pb-2 sm:hidden"
        linkClassName="h-10"
      />
    </header>
  );
}

export function AppHeaderSkeleton() {
  return (
    <header
      aria-hidden="true"
      className="border-b bg-background text-sm text-foreground"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-auto items-center gap-3">
          <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
            T
          </span>
          <span className="h-9 w-56 max-w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none max-sm:h-10" />
          <span className="ml-3 hidden items-center gap-1 sm:flex">
            <span className="h-9 w-[90px] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
            <span className="h-9 w-[92px] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          </span>
        </div>
        <div className="flex flex-none items-center gap-3">
          <span className="hidden h-5 w-40 animate-pulse rounded-sm bg-muted motion-reduce:animate-none sm:block" />
          <span className="h-9 w-[86px] animate-pulse rounded-md bg-muted motion-reduce:animate-none max-sm:h-10" />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 pb-2 sm:hidden">
        <span className="h-10 w-[90px] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
        <span className="h-10 w-[92px] animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      </div>
    </header>
  );
}
