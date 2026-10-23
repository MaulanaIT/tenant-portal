"use client";

import {
  useIsMutating,
  useMutation,
  useMutationState,
  type Mutation,
  type QueryClient,
} from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import { createElement } from "react";
import { toast } from "sonner";
import type { MembersResponse, Role } from "@/lib/members-types";
import { handleUnauthenticated } from "@/lib/query/handle-unauthenticated";
import { updateMemberRole } from "./actions";
import { memberKeys } from "./members-query";
import { useMembersUI } from "./members-ui-store";
import {
  RoleChangeError,
  applyMember,
  applyRoleChange,
  findMember,
  invalidatesImmediately,
  roleChangeErrorCode,
  roleChangeErrorDescription,
  roleChangeMessage,
  roleChangedDescription,
  roleChangedTitle,
  roleToastId,
  toRoleChangeError,
} from "./role-change";

type RoleChangeVariables = {
  userId: string;
  role: Role;
  name: string;
  email: string;
};

type RoleChangeContext = { userId: string; previousRole: Role | null };

function roleChangeMutationKey(tenantId: string) {
  return ["updateMemberRole", tenantId] as const;
}

export function pendingRoleChangeUserIds(client: QueryClient, tenantId: string): string[] {
  return client
    .getMutationCache()
    .findAll({ mutationKey: roleChangeMutationKey(tenantId), status: "pending" })
    .map(
      (mutation) =>
        (mutation as Mutation<unknown, unknown, RoleChangeVariables>).state.variables?.userId ??
        "",
    );
}

export function usePendingRoleChanges(tenantId: string): string[] {
  return useMutationState({
    filters: { mutationKey: roleChangeMutationKey(tenantId), status: "pending" },
    select: (mutation) =>
      (mutation as Mutation<unknown, unknown, RoleChangeVariables>).state.variables?.userId ??
      "",
  });
}

export function useIsSavingRole(tenantId: string): boolean {
  return useIsMutating({ mutationKey: roleChangeMutationKey(tenantId) }) > 0;
}

export function useUpdateMemberRole(tenantId: string, tenantName: string) {
  const select = useMembersUI((state) => state.select);
  const queryKey = memberKeys.all(tenantId);

  return useMutation<MembersResponse["members"][number], Error, RoleChangeVariables, RoleChangeContext>({
    mutationKey: roleChangeMutationKey(tenantId),
    mutationFn: async ({ userId, role }) => {
      let result;
      try {
        result = await updateMemberRole({ tenantId, userId, role });
      } catch {
        throw new RoleChangeError("API_UNAVAILABLE", 503);
      }
      if (!result.ok) {
        throw toRoleChangeError(result);
      }
      return result.member;
    },
    onMutate: async ({ userId, role }, context) => {
      await context.client.cancelQueries({ queryKey });
      const previousRole =
        findMember(context.client.getQueryData<MembersResponse>(queryKey), userId)?.role ?? null;
      context.client.setQueryData<MembersResponse>(queryKey, (data) =>
        data ? applyRoleChange(data, userId, role) : data,
      );
      select(userId);
      return { userId, previousRole };
    },
    onSuccess: (member, _variables, _onMutateResult, context) => {
      context.client.setQueryData<MembersResponse>(queryKey, (data) =>
        data ? applyMember(data, member) : data,
      );
      select(member.userId);
      const options = {
        id: roleToastId(tenantId, member.userId),
        description: roleChangedDescription(member.email, tenantName),
      };
      const title = roleChangedTitle(member.name, member.role);
      if (member.role === "ADMIN") {
        toast.success(title, options);
      } else {
        toast(title, {
          ...options,
          icon: createElement(InfoIcon, { className: "size-4", "aria-hidden": true }),
        });
      }
    },
    onError: (error, variables, onMutateResult, context) => {
      const code = roleChangeErrorCode(error);
      if (code === "UNAUTHENTICATED") {
        void handleUnauthenticated();
        return;
      }
      const previousRole = onMutateResult?.previousRole;
      if (previousRole) {
        context.client.setQueryData<MembersResponse>(queryKey, (data) =>
          data ? applyRoleChange(data, variables.userId, previousRole) : data,
        );
      }
      toast.error(roleChangeMessage(code), {
        id: roleToastId(tenantId, variables.userId),
        description: previousRole
          ? roleChangeErrorDescription(code, variables.name, previousRole)
          : undefined,
      });
      if (invalidatesImmediately(code)) {
        void context.client.invalidateQueries({ queryKey });
      }
    },
    onSettled: (_data, error, _variables, _onMutateResult, context) => {
      if (roleChangeErrorCode(error) === "UNAUTHENTICATED") {
        return;
      }
      if (context.client.isMutating({ mutationKey: roleChangeMutationKey(tenantId) }) === 1) {
        void context.client.invalidateQueries({ queryKey });
      }
    },
  });
}
