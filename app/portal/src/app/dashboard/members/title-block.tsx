import { ViewToggle } from "./view-toggle";

export function TitleBlock({
  title,
  summary,
  status,
}: {
  title: string;
  summary: string;
  status?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl leading-8 font-semibold tracking-tight text-pretty">
        {title}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-muted-foreground tabular-nums text-pretty">{summary}</p>
          {status}
        </div>
        <ViewToggle />
      </div>
    </div>
  );
}
