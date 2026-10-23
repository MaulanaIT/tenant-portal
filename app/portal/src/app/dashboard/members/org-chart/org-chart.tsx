"use client";

import "./org-chart.css";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type AriaLabelConfig,
  type FitViewOptions,
  type NodeMouseHandler,
} from "@xyflow/react";
import { MaximizeIcon, MinusIcon, PlusIcon, type LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import type { MemberDto } from "@/lib/members-types";
import { chartNodeSelector } from "../chart-focus";
import type { MemberFilters } from "../member-filters";
import { CHART_HELP, ZOOM_LABELS, chartLabel } from "../members-copy";
import { useMembersUI } from "../members-ui-store";
import { buildOrgGraph, type OrgNode } from "./build-org-graph";
import { ChartTenantContext } from "./chart-context";
import { chartCanvasClass } from "./org-chart-lazy";
import { nodeTypes } from "./nodes";
import { useReducedMotion } from "./use-reduced-motion";

type OrgChartProps = {
  tenantId: string;
  tenantName: string;
  members: readonly MemberDto[];
  filters: MemberFilters;
};

const FIT_VIEW_OPTIONS = { padding: 0.06, maxZoom: 1 } satisfies FitViewOptions;

const MIN_ZOOM = 0.2;

const MAX_ZOOM = 1.6;

const ARIA_LABEL_CONFIG: Partial<AriaLabelConfig> = {
  "node.a11yDescription.default": CHART_HELP,
  "edge.a11yDescription.default": "",
  "controls.ariaLabel": ZOOM_LABELS.toolbar,
  "controls.zoomIn.ariaLabel": ZOOM_LABELS.zoomIn,
  "controls.zoomOut.ariaLabel": ZOOM_LABELS.zoomOut,
  "controls.fitView.ariaLabel": ZOOM_LABELS.fitView,
};

const controlButtonClass =
  "flex size-10 cursor-pointer items-center justify-center border-b border-border bg-card text-foreground transition-colors duration-150 ease-out last:border-b-0 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none";

function layoutKey(collapsed: Record<string, boolean>, members: readonly MemberDto[]): string {
  const roles = members.map((member) => `${member.userId}:${member.role}`).sort();
  return `${collapsed.ADMIN}|${collapsed.MEMBER}|${roles.join(",")}`;
}

function ControlButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={controlButtonClass}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}

function ZoomControls({ duration }: { duration: number }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel
      position="bottom-left"
      role="toolbar"
      aria-label={ZOOM_LABELS.toolbar}
      aria-orientation="vertical"
      className="m-4 flex flex-col overflow-hidden rounded-md border bg-card shadow-elev-sm"
    >
      <ControlButton
        label={ZOOM_LABELS.zoomIn}
        icon={PlusIcon}
        onClick={() => void zoomIn({ duration })}
      />
      <ControlButton
        label={ZOOM_LABELS.zoomOut}
        icon={MinusIcon}
        onClick={() => void zoomOut({ duration })}
      />
      <ControlButton
        label={ZOOM_LABELS.fitView}
        icon={MaximizeIcon}
        onClick={() => void fitView({ ...FIT_VIEW_OPTIONS, duration })}
      />
    </Panel>
  );
}

function focusNodeWrapper(id: string) {
  document.querySelector<HTMLElement>(chartNodeSelector(id))?.focus({ preventScroll: true });
}

function Chart({ tenantName, members, filters }: OrgChartProps) {
  const helpId = useId();
  const collapsed = useMembersUI((state) => state.collapsed);
  const selectedId = useMembersUI((state) => state.selectedId);
  const resetCount = useMembersUI((state) => state.resetCount);
  const select = useMembersUI((state) => state.select);
  const setCollapsed = useMembersUI((state) => state.setCollapsed);
  const setCardMenu = useMembersUI((state) => state.setCardMenu);
  const { fitView } = useReactFlow();
  const duration = useReducedMotion() ? 0 : 400;
  const sized = useStore((state) => state.width > 0 && state.height > 0 && state.panZoom !== null);

  const { nodes, edges } = useMemo(
    () =>
      buildOrgGraph({
        tenant: { name: tenantName },
        members,
        collapsed,
        filters,
        selectedId,
      }),
    [tenantName, members, collapsed, filters, selectedId],
  );

  const admins = members.filter((member) => member.role === "ADMIN").length;
  const currentLayout = layoutKey(collapsed, members);
  const entered = useRef(false);
  const lastLayout = useRef(currentLayout);
  const lastReset = useRef(resetCount);

  useEffect(() => {
    if (entered.current || !sized) {
      return;
    }
    const target = selectedId
      ? members.find((member) => member.userId === selectedId)
      : undefined;
    if (target && collapsed[target.role]) {
      setCollapsed(target.role, false);
      return;
    }
    entered.current = true;
    lastLayout.current = currentLayout;
    if (!target) {
      void fitView(FIT_VIEW_OPTIONS);
      return;
    }
    void fitView({ nodes: [{ id: target.userId }], minZoom: 1, maxZoom: 1, duration }).then(
      () => focusNodeWrapper(target.userId),
    );
  }, [collapsed, currentLayout, duration, fitView, members, selectedId, setCollapsed, sized]);

  useEffect(() => {
    if (!entered.current || lastLayout.current === currentLayout) {
      return;
    }
    lastLayout.current = currentLayout;
    void fitView({ ...FIT_VIEW_OPTIONS, duration });
  }, [currentLayout, duration, fitView]);

  useEffect(() => {
    if (lastReset.current === resetCount) {
      return;
    }
    lastReset.current = resetCount;
    void fitView({ ...FIT_VIEW_OPTIONS, duration });
  }, [resetCount, duration, fitView]);

  const onNodeClick: NodeMouseHandler<OrgNode> = (_event, node) => {
    if (node.type === "member") {
      select(node.id);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || !target.classList.contains("react-flow__node-member")) {
      return;
    }
    const id = target.dataset.id;
    if (id) {
      event.preventDefault();
      select(id);
    }
  };

  return (
    <>
      <p id={helpId} className="sr-only">
        {CHART_HELP}
      </p>
      <div
        role="group"
        aria-label={chartLabel(tenantName, admins, members.length - admins)}
        aria-describedby={helpId}
        className={chartCanvasClass}
      >
        <ReactFlow<OrgNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode="system"
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          disableKeyboardA11y
          ariaLabelConfig={ARIA_LABEL_CONFIG}
          onNodeClick={onNodeClick}
          onMoveStart={() => setCardMenu(null)}
          onKeyDown={onKeyDown}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={2} />
          <ZoomControls duration={duration} />
        </ReactFlow>
      </div>
    </>
  );
}

export default function OrgChart(props: OrgChartProps) {
  const tenant = useMemo(
    () => ({ tenantId: props.tenantId, tenantName: props.tenantName }),
    [props.tenantId, props.tenantName],
  );
  return (
    <ReactFlowProvider>
      <ChartTenantContext.Provider value={tenant}>
        <Chart {...props} />
      </ChartTenantContext.Provider>
    </ReactFlowProvider>
  );
}
