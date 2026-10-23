import { focusChartNode } from "./chart-focus";

export function roleTriggerId(userId: string): string {
  return `role-trigger-${userId}`;
}

export function hasLostFocus(): boolean {
  return document.activeElement === null || document.activeElement === document.body;
}

export function focusRoleControl(userId: string) {
  const trigger = document.getElementById(roleTriggerId(userId));
  if (trigger?.isConnected) {
    trigger.focus();
    return;
  }
  if (focusChartNode(userId)) {
    return;
  }
  document.querySelector<HTMLElement>('[role="search"] input')?.focus();
}
