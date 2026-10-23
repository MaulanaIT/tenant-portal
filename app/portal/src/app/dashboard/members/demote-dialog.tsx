"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MemberDto } from "@/lib/members-types";
import { demoteDialogCopy } from "./members-copy";
import { useMembersUI } from "./members-ui-store";
import { canStartRoleChange } from "./role-change";
import { focusRoleControl } from "./role-focus";
import { pendingRoleChangeUserIds, useUpdateMemberRole } from "./use-update-member-role";

function useOpenerKeys() {
  const held = useRef(new Set<string>());
  const opener = useRef(new Set<string>());

  useEffect(() => {
    const heldKeys = held.current;
    const openerKeys = opener;
    const onKeyDown = (event: KeyboardEvent) => {
      heldKeys.add(event.code || event.key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.code || event.key;
      heldKeys.delete(key);
      setTimeout(() => openerKeys.current.delete(key), 0);
    };
    const onBlur = () => {
      heldKeys.clear();
      openerKeys.current.clear();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return {
    rememberHeldKeys: () => {
      opener.current = new Set(held.current);
    },
    isOpenerKeyHeld: () => opener.current.size > 0,
  };
}

function isDemotable(member: MemberDto | undefined): member is MemberDto {
  return member !== undefined && member.canChangeRole && member.role === "ADMIN";
}

export function DemoteDialog({
  tenantId,
  tenantName,
  members,
}: {
  tenantId: string;
  tenantName: string;
  members: readonly MemberDto[];
}) {
  const queryClient = useQueryClient();
  const pendingDemotion = useMembersUI((state) => state.pendingDemotion);
  const setPendingDemotion = useMembersUI((state) => state.setPendingDemotion);
  const mutation = useUpdateMemberRole(tenantId, tenantName);
  const { rememberHeldKeys, isOpenerKeyHeld } = useOpenerKeys();

  const target = pendingDemotion
    ? members.find((member) => member.userId === pendingDemotion.userId)
    : undefined;
  const open = isDemotable(target);
  const [shown, setShown] = useState<MemberDto | null>(null);
  if (open && target !== shown) {
    setShown(target);
  }

  useEffect(() => {
    if (pendingDemotion && !open) {
      setPendingDemotion(null);
    }
  }, [pendingDemotion, open, setPendingDemotion]);

  const close = () => setPendingDemotion(null);

  const confirm = () => {
    if (!target) {
      return;
    }
    close();
    if (!canStartRoleChange(pendingRoleChangeUserIds(queryClient, tenantId), target.userId)) {
      return;
    }
    mutation.mutate({
      userId: target.userId,
      role: "MEMBER",
      name: target.name,
      email: target.email,
    });
  };

  const member = target ?? shown;
  const copy = demoteDialogCopy(member?.name ?? "", tenantName);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
        }
      }}
    >
      <AlertDialogContent
        overlayProps={{ onClick: close }}
        onOpenAutoFocus={rememberHeldKeys}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (member) {
            focusRoleControl(member.userId);
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <p className="text-muted-foreground">{member?.email}</p>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-foreground">
            <dt className="font-medium">{copy.losesTerm}</dt>
            <dd>{copy.loses}</dd>
            <dt className="font-medium">{copy.keepsTerm}</dt>
            <dd>{copy.keeps}</dd>
          </dl>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="bg-popover"
            onClick={(event) => {
              if (event.detail === 0 && isOpenerKeyHeld()) {
                event.preventDefault();
              }
            }}
          >
            {copy.cancel}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="border-0" onClick={confirm}>
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
