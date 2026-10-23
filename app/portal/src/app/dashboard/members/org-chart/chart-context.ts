"use client";

import { createContext, useContext } from "react";

type ChartTenant = { tenantId: string; tenantName: string };

export const ChartTenantContext = createContext<ChartTenant | null>(null);

export function useChartTenant(): ChartTenant {
  const tenant = useContext(ChartTenantContext);
  if (!tenant) {
    throw new Error("useChartTenant must be used inside ChartTenantContext");
  }
  return tenant;
}
