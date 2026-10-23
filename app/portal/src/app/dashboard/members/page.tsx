import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/api";
import { getMembers } from "@/lib/members";
import { getQueryClient } from "@/lib/query/get-query-client";
import { AppHeader, AppHeaderSkeleton } from "../app-header";
import { membersQueryOptions } from "./members-query";
import { MembersSkeleton } from "./members-skeleton";
import { MembersUIStoreProvider } from "./members-ui-store";
import { MembersView } from "./members-view";
import { NoAccess, NoTenants } from "./no-access";

export const metadata: Metadata = { title: "Members · Tenant Portal" };

export default function MembersPage({
  searchParams,
}: PageProps<"/dashboard/members">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <>
            <AppHeaderSkeleton />
            <MembersSkeleton />
          </>
        }
      >
        <Members searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Members({
  searchParams,
}: Pick<PageProps<"/dashboard/members">, "searchParams">) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const slug = typeof params.tenant === "string" && params.tenant ? params.tenant : null;

  if (user.tenants.length === 0) {
    return (
      <>
        <AppHeader user={user} tenant={null} active="members" />
        <NoTenants />
      </>
    );
  }

  const tenant = slug
    ? user.tenants.find((candidate) => candidate.slug === slug)
    : user.tenants[0];

  if (!tenant) {
    return (
      <>
        <AppHeader user={user} tenant={null} active="members" />
        <NoAccess />
      </>
    );
  }

  const queryClient = getQueryClient();
  try {
    await queryClient.query({
      ...membersQueryOptions(tenant.id, () => getMembers(tenant.id)),
      retry: false,
    });
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      <AppHeader user={user} tenant={tenant} active="members" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MembersUIStoreProvider key={tenant.id}>
          <MembersView tenantId={tenant.id} tenantName={tenant.name} />
        </MembersUIStoreProvider>
      </HydrationBoundary>
    </>
  );
}
