"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
  type Row,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MemberDto } from "@/lib/members-types";
import { cn } from "@/lib/utils";
import { formatJoined } from "./format-joined";
import { STATUS_DOT, initials } from "./member-display";
import { parseSort, type MemberSort, type SortKey } from "./member-filters";
import { STATUS_LABEL, tableCaption } from "./members-copy";
import { useMembersUI } from "./members-ui-store";
import { RoleControl } from "./role-control";

const features = tableFeatures({});

type Features = typeof features;

const helper = createColumnHelper<Features, MemberDto>();

function isTruncated(element: HTMLElement | null): boolean {
  return element !== null && element.scrollWidth > element.clientWidth;
}

function NameCell({ member }: { member: MemberDto }) {
  const selected = useMembersUI((state) => state.selectedId === member.userId);
  return (
    <div className="flex items-center gap-3">
      <Avatar aria-hidden="true" className="size-8">
        <AvatarFallback className={cn(selected ? "bg-background" : "bg-muted")}>
          {initials(member.name)}
        </AvatarFallback>
      </Avatar>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-medium">{member.name}</span>
        {member.isSelf ? <span className="text-muted-foreground">(you)</span> : null}
        {selected ? <span className="sr-only">, selected</span> : null}
      </span>
    </div>
  );
}

function EmailCell({ email }: { email: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const row = ref.current?.closest("tr");
    if (!row) {
      return;
    }
    const onFocus = (event: FocusEvent) => {
      if (event.target === row && isTruncated(ref.current)) {
        setOpen(true);
      }
    };
    const close = () => setOpen(false);
    row.addEventListener("focus", onFocus);
    row.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      row.removeEventListener("focus", onFocus);
      row.removeEventListener("blur", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => setOpen(next && isTruncated(ref.current))}
    >
      <TooltipTrigger asChild>
        <span ref={ref} className="block truncate text-muted-foreground">
          {email}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{email}</TooltipContent>
    </Tooltip>
  );
}

function buildColumns(tenantId: string, tenantName: string) {
  return helper.columns([
    helper.accessor("name", {
      header: "Name",
      cell: ({ row }) => <NameCell member={row.original} />,
    }),
    helper.accessor("email", {
      header: "Email",
      cell: ({ row }) => <EmailCell email={row.original.email} />,
    }),
    helper.accessor("role", {
      header: "Role",
      cell: ({ row }) => (
        <RoleControl
          member={row.original}
          tenantId={tenantId}
          tenantName={tenantName}
          variant="select"
        />
      ),
    }),
    helper.accessor("status", {
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-2 flex-none rounded-full", STATUS_DOT[row.original.status])}
          />
          {STATUS_LABEL[row.original.status]}
        </span>
      ),
    }),
    helper.accessor("joinedAt", {
      header: "Joined",
      cell: ({ row }) => (
        <time dateTime={row.original.joinedAt} title={row.original.joinedAt}>
          {formatJoined(row.original.joinedAt)}
        </time>
      ),
    }),
  ]);
}

const COLUMN_UI: Record<
  string,
  { sortKey?: SortKey; head?: string; cell?: string }
> = {
  name: { sortKey: "name" },
  email: { sortKey: "email", cell: "max-w-[260px]" },
  role: { sortKey: "role", head: "w-[200px]" },
  status: { head: "w-[130px] px-5" },
  joinedAt: { sortKey: "joined", head: "w-[140px]", cell: "tabular-nums" },
};

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

function SortButton({
  label,
  direction,
  onClick,
}: {
  label: React.ReactNode;
  direction: "asc" | "desc" | null;
  onClick: () => void;
}) {
  const Icon =
    direction === "asc" ? ArrowUpIcon : direction === "desc" ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "border-0 px-2",
        direction ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      <Icon
        aria-hidden="true"
        className={cn("size-3.5", direction ? null : "opacity-60")}
      />
    </Button>
  );
}

function MemberRow({
  row,
  isLast,
  children,
}: {
  row: Row<Features, MemberDto>;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const userId = row.original.userId;
  const selected = useMembersUI((state) => state.selectedId === userId);
  const select = useMembersUI((state) => state.select);

  return (
    <TableRow
      tabIndex={0}
      data-selected={selected ? "true" : undefined}
      onClick={() => select(userId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault();
          select(userId);
        }
      }}
      className={cn(
        "h-[52px] cursor-pointer data-[selected=true]:bg-selected data-[selected=true]:hover:bg-selected",
        isLast && "border-b-0",
      )}
    >
      {children}
    </TableRow>
  );
}

export function MembersTable({
  members,
  tenantId,
  tenantName,
  sort,
  onSortChange,
  footer,
}: {
  members: MemberDto[];
  tenantId: string;
  tenantName: string;
  sort: MemberSort;
  onSortChange: (key: SortKey) => void;
  footer?: React.ReactNode;
}) {
  const columns = useMemo(() => buildColumns(tenantId, tenantName), [tenantId, tenantName]);
  const table = useTable(
    {
      features,
      columns,
      data: members,
      getRowId: (member) => member.userId,
    },
    () => null,
  );
  const active = parseSort(sort);
  const rows = table.getRowModel().rows;

  return (
    <div className="max-h-[min(720px,calc(100vh-160px))] overflow-auto rounded-xl border bg-card shadow-elev-sm">
      <Table className="min-w-[820px]">
        <caption className="sr-only">{tableCaption(tenantName)}</caption>
        <TableHeader className="[&_tr]:border-b-0">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const ui = COLUMN_UI[header.column.id] ?? {};
                const direction =
                  ui.sortKey && ui.sortKey === active.key ? active.direction : null;
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={ui.sortKey ? (direction ? ARIA_SORT[direction] : "none") : undefined}
                    className={cn(
                      "sticky top-0 z-[1] h-10 bg-card px-3 shadow-[inset_0_-1px_0_var(--border)]",
                      ui.head,
                    )}
                  >
                    {ui.sortKey ? (
                      <SortButton
                        label={<table.FlexRender header={header} />}
                        direction={direction}
                        onClick={() => onSortChange(ui.sortKey as SortKey)}
                      />
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </tr>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <MemberRow key={row.id} row={row} isLast={index === rows.length - 1}>
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={COLUMN_UI[cell.column.id]?.cell}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </MemberRow>
          ))}
        </TableBody>
      </Table>
      {footer}
    </div>
  );
}
