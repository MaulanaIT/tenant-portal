"use client";

import { Handle, Position, type NodeProps, type NodeTypes } from "@xyflow/react";
import { ChevronDownIcon } from "lucide-react";
import { memo } from "react";
import { cn } from "@/lib/utils";
import { STATUS_DOT, initials } from "../member-display";
import {
  EMPTY_GROUP,
  ROLE_LABEL,
  STATUS_LABEL,
  groupTitle,
  groupToggleLabel,
  peopleCount,
} from "../members-copy";
import { useMembersUI } from "../members-ui-store";
import { RoleControl } from "../role-control";
import { usePendingRoleChanges } from "../use-update-member-role";
import type { MemberNode, RoleGroupNode, TenantNode } from "./build-org-graph";
import { useChartTenant } from "./chart-context";

const handleClass = "pointer-events-none size-0 min-h-0 min-w-0 border-0 opacity-0";

const DIM_BORDER = "border-[color-mix(in_srgb,var(--border)_40%,transparent)]";

const TenantNodeView = memo(function TenantNodeView({ data }: NodeProps<TenantNode>) {
  return (
    <div className="flex size-full items-center gap-3 rounded-lg border bg-card px-4 text-card-foreground">
      <span
        aria-hidden="true"
        className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
      >
        {data.name.trim().charAt(0).toUpperCase()}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-base leading-6 font-semibold">{data.name}</span>
        <span className="text-muted-foreground tabular-nums">{peopleCount(data.count)}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={handleClass}
      />
    </div>
  );
});

const RoleGroupNodeView = memo(function RoleGroupNodeView({ data }: NodeProps<RoleGroupNode>) {
  const toggleCollapsed = useMembersUI((state) => state.toggleCollapsed);
  return (
    <div
      data-dim={data.dim ? "true" : undefined}
      className="size-full overflow-hidden rounded-xl border bg-muted data-[dim=true]:border-dashed data-[dim=true]:bg-transparent"
    >
      <div
        className={cn(
          "flex h-11 items-center gap-1.5 pr-3 pl-2",
          data.collapsed ? null : "border-b",
        )}
      >
        <button
          type="button"
          aria-expanded={!data.collapsed}
          aria-label={groupToggleLabel(data.role, data.collapsed)}
          onClick={() => toggleCollapsed(data.role)}
          onKeyDown={(event) => event.stopPropagation()}
          className="nodrag nopan flex size-7 flex-none cursor-pointer items-center justify-center rounded-md text-foreground transition-colors duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:size-10 motion-reduce:transition-none"
        >
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform duration-150 ease-out motion-reduce:transition-none",
              data.collapsed ? "-rotate-90" : null,
            )}
          />
        </button>
        <span
          className={cn(
            "font-semibold tabular-nums",
            data.dim ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {groupTitle(data.role, data.count)}
        </span>
      </div>
      {data.empty && !data.collapsed ? (
        <p className="p-6 text-muted-foreground">{EMPTY_GROUP}</p>
      ) : null}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className={handleClass}
      />
    </div>
  );
});

const MemberNodeView = memo(function MemberNodeView({ data }: NodeProps<MemberNode>) {
  const { tenantId, tenantName } = useChartTenant();
  const pending = usePendingRoleChanges(tenantId).includes(data.member.userId);
  const { member, dim, selected } = data;
  const highlight = data.filtering && data.match;
  const tinted = selected || pending;

  return (
    <div
      data-selected={selected ? "true" : undefined}
      data-match={highlight ? "true" : undefined}
      data-dim={dim ? "true" : undefined}
      data-pending={pending ? "true" : undefined}
      className={cn(
        "flex size-full cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-card-foreground transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-input motion-reduce:transition-none",
        dim ? DIM_BORDER : tinted ? "border-selected-border" : "border-border",
        dim ? "bg-transparent" : tinted ? "bg-selected" : "bg-card",
        selected ? "ring-2 ring-ring" : highlight ? "ring-2 ring-match-ring" : null,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 flex-none items-center justify-center rounded-full border text-xs font-medium text-foreground",
          dim ? DIM_BORDER : "border-transparent",
          dim ? "bg-transparent" : selected ? "bg-background" : "bg-muted",
        )}
      >
        {initials(member.name)}
      </span>
      <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-1 leading-5">
          <span className="truncate font-medium">{member.name}</span>
          {member.isSelf ? (
            <span className="flex-none text-muted-foreground">(you)</span>
          ) : null}
        </span>
        <span
          className={cn(
            "truncate text-xs font-medium",
            dim ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {member.email}
        </span>
        <span className="mt-px flex items-center gap-2 text-xs font-medium">
          <span
            className={cn(
              "rounded-full border px-1.5",
              member.role === "ADMIN" ? "text-badge-admin-fg" : "text-badge-member-fg",
              dim
                ? "border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-transparent"
                : member.role === "ADMIN"
                  ? "border-transparent bg-badge-admin-bg"
                  : "border-transparent bg-badge-member-bg",
            )}
          >
            {ROLE_LABEL[member.role]}
          </span>
          <span className="inline-flex items-center gap-1 text-foreground">
            <span
              className={cn(
                "size-1.5 flex-none rounded-full",
                STATUS_DOT[member.status],
                dim ? "opacity-40" : null,
              )}
            />
            {STATUS_LABEL[member.status]}
          </span>
        </span>
      </div>
      {data.canChangeRole ? (
        <RoleControl
          member={member}
          tenantId={tenantId}
          tenantName={tenantName}
          variant="menu"
        />
      ) : null}
    </div>
  );
});

export const nodeTypes = {
  tenant: TenantNodeView,
  roleGroup: RoleGroupNodeView,
  member: MemberNodeView,
} satisfies NodeTypes;
