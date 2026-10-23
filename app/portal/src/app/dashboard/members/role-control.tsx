"use client";

import { useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon, LockIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLES, isRole, type MemberDto, type Role } from "@/lib/members-types";
import { cn } from "@/lib/utils";
import {
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  ROLE_MENU_LABEL,
  SELF_ROLE_REASON,
  changeRoleLabel,
} from "./members-copy";
import { focusChartNode } from "./chart-focus";
import { focusRoleControl, hasLostFocus, roleTriggerId } from "./role-focus";
import { useMembersUI } from "./members-ui-store";
import { canStartRoleChange, isRoleChange } from "./role-change";
import {
  pendingRoleChangeUserIds,
  usePendingRoleChanges,
  useUpdateMemberRole,
} from "./use-update-member-role";

type RoleControlVariant = "select" | "menu";

function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge variant={role === "ADMIN" ? "admin" : "member"} className={className}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}

function SelfRoleBadge({ role }: { role: Role }) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-describedby={reasonId}
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }}
          className="inline-flex cursor-default items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:min-h-10"
        >
          <Badge variant={role === "ADMIN" ? "admin" : "member"} className="pl-2">
            <LockIcon aria-hidden="true" />
            {ROLE_LABEL[role]}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} aria-hidden="true">
        {SELF_ROLE_REASON}
      </TooltipContent>
      <span id={reasonId} className="sr-only">
        {SELF_ROLE_REASON}
      </span>
    </Tooltip>
  );
}

function useRoleChoice(member: MemberDto, tenantId: string, tenantName: string) {
  const queryClient = useQueryClient();
  const select = useMembersUI((state) => state.select);
  const setPendingDemotion = useMembersUI((state) => state.setPendingDemotion);
  const pendingUserIds = usePendingRoleChanges(tenantId);
  const busy = !canStartRoleChange(pendingUserIds, member.userId);
  const mutation = useUpdateMemberRole(tenantId, tenantName);

  const isFree = () =>
    canStartRoleChange(pendingRoleChangeUserIds(queryClient, tenantId), member.userId);

  const choose = (value: string) => {
    if (!isRole(value) || !isRoleChange(member.role, value) || !isFree()) {
      return;
    }
    select(member.userId);
    if (value === "MEMBER") {
      setPendingDemotion({ userId: member.userId });
      return;
    }
    mutation.mutate({
      userId: member.userId,
      role: value,
      name: member.name,
      email: member.email,
    });
  };

  return { busy, isFree, choose, selectMember: () => select(member.userId) };
}

function RoleSelect({
  member,
  tenantId,
  tenantName,
}: {
  member: MemberDto;
  tenantId: string;
  tenantName: string;
}) {
  const [open, setOpen] = useState(false);
  const ownsFocus = useRef(false);
  const { busy, isFree, choose, selectMember } = useRoleChoice(member, tenantId, tenantName);
  const { userId } = member;

  useEffect(() => {
    const focusOwner = ownsFocus;
    return () => {
      if (!focusOwner.current) {
        return;
      }
      requestAnimationFrame(() => {
        if (hasLostFocus()) {
          focusRoleControl(userId);
        }
      });
    };
  }, [userId]);

  const onOpenChange = (next: boolean) => {
    if (next && !isFree()) {
      return;
    }
    setOpen(next);
    if (next) {
      selectMember();
    }
  };

  const onValueChange = (value: string) => {
    ownsFocus.current = true;
    setOpen(false);
    choose(value);
  };

  return (
    <Select
      value={member.role}
      open={open}
      onOpenChange={onOpenChange}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        id={roleTriggerId(member.userId)}
        aria-label={changeRoleLabel(member.name)}
        aria-busy={busy}
        aria-disabled={busy}
        onFocus={() => {
          ownsFocus.current = true;
        }}
        onBlur={(event) => {
          if (event.relatedTarget) {
            ownsFocus.current = false;
          }
        }}
        icon={busy ? <Spinner /> : undefined}
        className={cn(
          "w-[136px]",
          busy ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="w-[264px] min-w-[264px]">
        {ROLES.map((role) => (
          <SelectItem
            key={role}
            value={role}
            description={<span className="font-normal">{ROLE_DESCRIPTION[role]}</span>}
            className="cursor-pointer font-medium"
          >
            {ROLE_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RoleMenu({
  member,
  tenantId,
  tenantName,
}: {
  member: MemberDto;
  tenantId: string;
  tenantName: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const open = useMembersUI((state) => state.cardMenuId === member.userId);
  const setCardMenu = useMembersUI((state) => state.setCardMenu);
  const demoting = useMembersUI((state) => state.pendingDemotion?.userId === member.userId);
  const { busy, isFree, choose, selectMember } = useRoleChoice(member, tenantId, tenantName);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      contentRef.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onOpenChange = (next: boolean) => {
    if (next && !isFree()) {
      return;
    }
    setCardMenu(next ? member.userId : null);
    if (next) {
      selectMember();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={changeRoleLabel(member.name)}
          aria-busy={busy}
          aria-disabled={busy}
          onKeyDown={(event) => event.stopPropagation()}
          className={cn(
            "nodrag nopan -mt-1 -mr-1.5 flex size-7 flex-none items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:size-10 motion-reduce:transition-none",
            busy ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          {busy ? <Spinner /> : <EllipsisIcon aria-hidden="true" className="size-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={contentRef}
        align="end"
        className="w-[200px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!demoting) {
            focusChartNode(member.userId);
          }
        }}
      >
        <DropdownMenuLabel>{ROLE_MENU_LABEL}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={member.role}
          onValueChange={(value) => {
            setCardMenu(null);
            choose(value);
          }}
          className="flex flex-col gap-0.5"
        >
          {ROLES.map((role) => (
            <DropdownMenuRadioItem key={role} value={role} className="cursor-pointer">
              {ROLE_LABEL[role]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RoleControl({
  member,
  tenantId,
  tenantName,
  variant,
}: {
  member: MemberDto;
  tenantId: string;
  tenantName: string;
  variant: RoleControlVariant;
}) {
  if (member.isSelf) {
    return <SelfRoleBadge role={member.role} />;
  }
  if (!member.canChangeRole) {
    return <RoleBadge role={member.role} />;
  }
  if (variant === "menu") {
    return <RoleMenu member={member} tenantId={tenantId} tenantName={tenantName} />;
  }
  return <RoleSelect member={member} tenantId={tenantId} tenantName={tenantName} />;
}
