"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { Role } from "@/lib/members-types";

type PendingDemotion = { userId: string };

type MembersUIState = {
  selectedId: string | null;
  collapsed: Record<Role, boolean>;
  pendingDemotion: PendingDemotion | null;
  resetCount: number;
  cardMenuId: string | null;
  select: (userId: string | null) => void;
  toggleCollapsed: (role: Role) => void;
  setCollapsed: (role: Role, collapsed: boolean) => void;
  expandAll: () => void;
  setPendingDemotion: (pending: PendingDemotion | null) => void;
  resetView: () => void;
  setCardMenu: (userId: string | null) => void;
};

function createMembersUIStore() {
  return createStore<MembersUIState>()((set) => ({
    selectedId: null,
    collapsed: { ADMIN: false, MEMBER: false },
    pendingDemotion: null,
    resetCount: 0,
    cardMenuId: null,
    select: (selectedId) => set({ selectedId }),
    toggleCollapsed: (role) =>
      set((state) => ({
        collapsed: { ...state.collapsed, [role]: !state.collapsed[role] },
      })),
    setCollapsed: (role, collapsed) =>
      set((state) => ({ collapsed: { ...state.collapsed, [role]: collapsed } })),
    expandAll: () => set({ collapsed: { ADMIN: false, MEMBER: false } }),
    setPendingDemotion: (pendingDemotion) => set({ pendingDemotion }),
    resetView: () =>
      set((state) => ({
        collapsed: { ADMIN: false, MEMBER: false },
        selectedId: null,
        resetCount: state.resetCount + 1,
      })),
    setCardMenu: (cardMenuId) => set({ cardMenuId }),
  }));
}

const MembersUIStoreContext = createContext<StoreApi<MembersUIState> | null>(null);

export function MembersUIStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(createMembersUIStore);
  return (
    <MembersUIStoreContext.Provider value={store}>
      {children}
    </MembersUIStoreContext.Provider>
  );
}

export function useMembersUI<T>(selector: (state: MembersUIState) => T): T {
  const store = useContext(MembersUIStoreContext);
  if (!store) {
    throw new Error("useMembersUI must be used inside MembersUIStoreProvider");
  }
  return useStore(store, selector);
}
