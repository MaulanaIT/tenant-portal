export function chartNodeSelector(id: string): string {
  return `.react-flow__node[data-id="${CSS.escape(id)}"]`;
}

export function focusChartNode(id: string): boolean {
  const node = document.querySelector<HTMLElement>(chartNodeSelector(id));
  if (!node) {
    return false;
  }
  const menuButton = node.querySelector<HTMLElement>('button[aria-haspopup="menu"]');
  (menuButton ?? node).focus({ preventScroll: true });
  return true;
}
