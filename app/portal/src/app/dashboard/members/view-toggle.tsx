"use client";

import { ListIcon, NetworkIcon } from "lucide-react";
import { useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { MEMBER_VIEWS, useMemberView, type MemberView } from "./members-params";

const itemClass =
  "h-[34px] gap-2 rounded-none px-3.5 font-medium max-sm:h-10";

const toggleGroupClass =
  "flex overflow-hidden rounded-md border border-input bg-background shadow-elev-sm";

function isMemberView(value: string): value is MemberView {
  return (MEMBER_VIEWS as readonly string[]).includes(value);
}

export function ViewToggle() {
  const [view, setView] = useMemberView();
  const listRef = useRef<HTMLButtonElement>(null);
  const chartRef = useRef<HTMLButtonElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const next: MemberView = view === "list" ? "chart" : "list";
    void setView(next);
    (next === "list" ? listRef : chartRef).current?.focus();
  };

  return (
    <ToggleGroup
      type="single"
      aria-label="View"
      spacing={0}
      value={view}
      onValueChange={(value) => {
        if (isMemberView(value)) {
          void setView(value);
        }
      }}
      className={toggleGroupClass}
    >
      <ToggleGroupItem
        ref={listRef}
        value="list"
        onKeyDown={onKeyDown}
        className={itemClass}
      >
        <ListIcon aria-hidden="true" />
        List
      </ToggleGroupItem>
      <ToggleGroupItem
        ref={chartRef}
        value="chart"
        onKeyDown={onKeyDown}
        className={cn(itemClass, "border-l border-input")}
      >
        <NetworkIcon aria-hidden="true" />
        Chart
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
