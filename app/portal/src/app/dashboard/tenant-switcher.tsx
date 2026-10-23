"use client";

import { ChevronDownIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import type { Tenant } from "@/lib/members-types";

const KEPT_PARAMS = ["view"];

export function TenantSwitcher({
  tenants,
  activeSlug,
}: {
  tenants: Tenant[];
  activeSlug: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const id = useId();

  return (
    <>
      <label htmlFor={id} className="sr-only">
        Organization
      </label>
      <div className="relative min-w-0 flex-[0_1_auto]">
        <select
          id={id}
          value={activeSlug ?? ""}
          aria-busy={pending}
          disabled={pending || (activeSlug !== null && tenants.length < 2)}
          onChange={(event) => {
            const current = new URLSearchParams(window.location.search);
            const next = new URLSearchParams({ tenant: event.target.value });
            for (const key of KEPT_PARAMS) {
              const value = current.get(key);
              if (value) {
                next.set(key, value);
              }
            }
            startTransition(() => router.push(`${pathname}?${next}`));
          }}
          className="h-9 w-full max-w-full cursor-pointer appearance-none truncate rounded-md border border-input bg-background pr-9 pl-3 text-sm font-medium text-foreground shadow-elev-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none max-sm:h-10"
        >
          {activeSlug === null && (
            <option value="" disabled>
              Choose an organization
            </option>
          )}
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.slug}>
              {tenant.name} · {tenant.role === "ADMIN" ? "Admin" : "Member"}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </>
  );
}
