"use client";

import { SearchIcon } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_FILTERS, type RoleFilter } from "./member-filters";
import { ROLE_LABEL } from "./members-copy";
import type { MemberView } from "./members-params";

const ROLE_FILTER_LABEL: Record<RoleFilter, string> = {
  all: "All",
  ADMIN: ROLE_LABEL.ADMIN,
  MEMBER: ROLE_LABEL.MEMBER,
};

function isRoleFilter(value: string): value is RoleFilter {
  return (ROLE_FILTERS as readonly string[]).includes(value);
}

export function MembersToolbar({
  view,
  q,
  role,
  shown,
  total,
  searchRef,
  onQueryChange,
  onRoleChange,
  actions,
}: {
  view: MemberView;
  q: string;
  role: RoleFilter;
  shown: number;
  total: number;
  searchRef: React.Ref<HTMLInputElement>;
  onQueryChange: (q: string) => void;
  onRoleChange: (role: RoleFilter) => void;
  actions?: React.ReactNode;
}) {
  const searchId = useId();
  const roleLabelId = useId();

  return (
    <div role="search" className="flex flex-wrap items-center gap-3">
      <div className="relative flex-[1_1_260px] max-w-[360px] max-sm:max-w-none">
        <label htmlFor={searchId} className="sr-only">
          Search members by name or email
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={searchRef}
          id={searchId}
          type="search"
          autoComplete="off"
          placeholder="Search name or email"
          aria-controls={view === "chart" ? "panel-chart" : "panel-list"}
          value={q}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9 shadow-elev-sm"
        />
      </div>
      <Select
        value={role}
        onValueChange={(value) => {
          if (isRoleFilter(value)) {
            onRoleChange(value);
          }
        }}
      >
        <SelectTrigger aria-labelledby={roleLabelId} className="min-w-[145px] pr-3 font-medium">
          <span className="flex items-baseline gap-1.5">
            <span id={roleLabelId} className="font-normal text-muted-foreground">
              Role:
            </span>
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {ROLE_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {ROLE_FILTER_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {actions}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="ml-auto whitespace-nowrap text-muted-foreground tabular-nums"
      >
        <span className="sr-only">Showing </span>
        {shown} of {total}
      </p>
    </div>
  );
}
