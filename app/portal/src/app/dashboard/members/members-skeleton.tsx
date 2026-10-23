import { ListIcon, NetworkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOADING_SUMMARY } from "./members-copy";
import { cardClass, mainClass } from "./member-states";

const bar = "rounded-sm bg-muted animate-pulse motion-reduce:animate-none";

const SKELETON_ROWS = [0, 1, 2, 3, 4];

function TogglePlaceholder() {
  const item = "flex h-[34px] items-center gap-2 px-3.5 font-medium max-sm:h-10";
  return (
    <div
      aria-hidden="true"
      inert
      className="flex overflow-hidden rounded-md border border-input bg-background shadow-elev-sm"
    >
      <span className={item}>
        <ListIcon className="size-4" />
        List
      </span>
      <span className={cn(item, "border-l border-input")}>
        <NetworkIcon className="size-4" />
        Chart
      </span>
    </div>
  );
}

export function MembersLoadingBody() {
  return (
    <>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            bar,
            "h-9 max-w-[360px] flex-[1_1_260px] rounded-md max-sm:h-10 max-sm:max-w-none",
          )}
        />
        <div className={cn(bar, "h-9 w-[145px] flex-none rounded-md max-sm:h-10")} />
      </div>
      <div
        aria-busy="true"
        aria-label="Loading members"
        className={cn(cardClass, "overflow-hidden")}
      >
        <div className="flex h-[41px] items-center border-b px-5">
          <div className={cn(bar, "h-3 w-[72px]")} />
        </div>
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="flex h-[52px] items-center gap-3 border-b px-5">
            <div className={cn(bar, "size-8 flex-none rounded-full")} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className={cn(bar, "h-3 w-[140px] max-w-full")} />
              <div className={cn(bar, "h-2.5 w-[180px] max-w-full")} />
            </div>
            <div className={cn(bar, "h-9 w-[140px] flex-none rounded-md max-sm:h-10")} />
            <div className={cn(bar, "h-3.5 w-[72px] flex-none")} />
          </div>
        ))}
      </div>
    </>
  );
}

export function MembersSkeleton() {
  return (
    <main className={mainClass}>
      <div className="flex flex-col gap-3">
        <div className={cn(bar, "h-8 w-60 max-w-full")} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground tabular-nums">{LOADING_SUMMARY}</p>
          <TogglePlaceholder />
        </div>
      </div>
      <MembersLoadingBody />
    </main>
  );
}
