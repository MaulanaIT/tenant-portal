"use client";

import { useQuery } from "@tanstack/react-query";
import { RotateCcwIcon, SearchIcon, UsersIcon } from "lucide-react";
import { useDeferredValue, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CLEAR_FILTERS_PATCH,
  compareMembers,
  isFiltering,
  matchesMember,
  nextSort,
} from "./member-filters";
import {
  CLEAR_FILTERS,
  EMPTY_COPY,
  LOADING_SUMMARY,
  NO_RESULTS_TITLE,
  RESET_VIEW,
  SAVING_ROLE,
  TRY_AGAIN,
  loadErrorBody,
  noResultsBody,
  onlyYouCopy,
  pageTitle,
} from "./members-copy";
import { membersQueryOptions, fetchMembers } from "./members-query";
import { useMembersParams } from "./members-params";
import { MembersLoadingBody } from "./members-skeleton";
import { MembersTable } from "./members-table";
import { MembersToolbar } from "./members-toolbar";
import {
  deriveMembersViewState,
  loadErrorCode,
  showsToolbar,
} from "./members-view-state";
import {
  LoadErrorCard,
  NoAccessCard,
  StateBlock,
  StateCard,
  mainClass,
} from "./member-states";
import { useMembersUI } from "./members-ui-store";
import { OrgChartLazy } from "./org-chart/org-chart-lazy";
import { DemoteDialog } from "./demote-dialog";
import { buildSummary } from "./summary";
import { TitleBlock } from "./title-block";
import { useIsSavingRole } from "./use-update-member-role";

export function MembersView({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const [{ view, q, role, sort }, setParams] = useMembersParams();
  const query = useQuery(
    membersQueryOptions(tenantId, () => fetchMembers(tenantId)),
  );
  const deferredQ = useDeferredValue(q);
  const searchRef = useRef<HTMLInputElement>(null);

  const filters = useMemo(() => ({ q: deferredQ, role }), [deferredQ, role]);
  const members = query.data?.members;
  const shown = useMemo(
    () =>
      members
        ? members.filter((member) => matchesMember(member, filters)).sort(compareMembers(sort))
        : [],
    [members, filters, sort],
  );
  const filtersActive = isFiltering(filters);

  const state = deriveMembersViewState({
    status: query.status,
    error: query.error,
    data: query.data,
    filteredCount: shown.length,
    filtersActive,
  });

  const summary =
    state === "loading"
      ? LOADING_SUMMARY
      : state === "no-access" || state === "error" || !query.data
        ? ""
        : buildSummary(query.data);
  const refreshing = query.status === "success" && query.isFetching;
  const saving = useIsSavingRole(tenantId);
  const resetView = useMembersUI((state) => state.resetView);
  const showsData = state === "ready" || state === "only-you" || state === "no-results";

  const clearFilters = () => {
    void setParams(CLEAR_FILTERS_PATCH);
    searchRef.current?.focus();
  };

  const footer =
    state === "only-you" ? (
      <StateBlock icon={UsersIcon} className="border-t" {...onlyYouCopy(tenantName)} />
    ) : state === "no-results" ? (
      <StateBlock
        icon={SearchIcon}
        className="border-t"
        title={NO_RESULTS_TITLE}
        body={noResultsBody(filters)}
        action={
          <Button type="button" variant="outline" onClick={clearFilters}>
            {CLEAR_FILTERS}
          </Button>
        }
      />
    ) : null;

  return (
    <main className={mainClass}>
      <TitleBlock
        title={pageTitle(state === "no-access" ? null : tenantName)}
        summary={summary}
        status={
          refreshing ? <Spinner className="text-muted-foreground" /> : null
        }
      />

      {showsToolbar(state) ? (
        <MembersToolbar
          view={view}
          q={q}
          role={role}
          shown={shown.length}
          total={members?.length ?? 0}
          searchRef={searchRef}
          onQueryChange={(next) => void setParams({ q: next || null })}
          onRoleChange={(next) => void setParams({ role: next })}
          actions={
            view === "chart" && showsData ? (
              <Button type="button" variant="outline" className="px-3.5" onClick={resetView}>
                <RotateCcwIcon aria-hidden="true" />
                {RESET_VIEW}
              </Button>
            ) : null
          }
        />
      ) : null}

      {state === "loading" ? <MembersLoadingBody /> : null}

      {state === "no-access" ? <NoAccessCard /> : null}

      {state === "error" ? (
        <LoadErrorCard
          body={loadErrorBody(loadErrorCode(query.error))}
          action={
            <Button
              type="button"
              variant="outline"
              aria-busy={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {TRY_AGAIN}
            </Button>
          }
        />
      ) : null}

      {state === "empty" ? <StateCard icon={UsersIcon} title={EMPTY_COPY.title} /> : null}

      {view === "list" && showsData ? (
        <section id="panel-list" aria-label="Members list">
          <TooltipProvider>
            <MembersTable
              members={shown}
              tenantId={tenantId}
              tenantName={tenantName}
              sort={sort}
              onSortChange={(key) => void setParams({ sort: nextSort(sort, key) })}
              footer={footer}
            />
          </TooltipProvider>
        </section>
      ) : null}

      {view === "chart" && showsData && members ? (
        <section id="panel-chart" aria-label="Members chart" className="flex flex-col gap-3">
          <OrgChartLazy
            tenantId={tenantId}
            tenantName={tenantName}
            members={members}
            filters={filters}
          />
        </section>
      ) : null}

      {members ? (
        <DemoteDialog tenantId={tenantId} tenantName={tenantName} members={members} />
      ) : null}

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saving ? SAVING_ROLE : ""}
      </div>
    </main>
  );
}
