import { CircleAlertIcon, LockIcon, type LucideIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { LOAD_ERROR_TITLE, NO_ACCESS_COPY } from "./members-copy";

export const cardClass = "rounded-xl border bg-card shadow-elev-sm";

export const mainClass =
  "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-foreground";

export function StateBlock({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Empty className={className}>
      {Icon ? (
        <EmptyMedia>
          <Icon />
        </EmptyMedia>
      ) : null}
      <EmptyTitle role="heading" aria-level={2}>
        {title}
      </EmptyTitle>
      {body ? <EmptyDescription>{body}</EmptyDescription> : null}
      {action ? <EmptyContent className="mt-3">{action}</EmptyContent> : null}
    </Empty>
  );
}

export function StateCard(props: React.ComponentProps<typeof StateBlock>) {
  return (
    <div className={cardClass}>
      <StateBlock {...props} />
    </div>
  );
}

export function NoAccessCard() {
  return (
    <StateCard icon={LockIcon} title={NO_ACCESS_COPY.title} body={NO_ACCESS_COPY.body} />
  );
}

export function LoadErrorCard({
  title = LOAD_ERROR_TITLE,
  body,
  action,
}: {
  title?: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div role="alert" className={cn(cardClass, "flex flex-col items-start gap-4 p-5")}>
      <div className="flex w-full items-start gap-2.5 rounded-lg border border-alert-error-border bg-alert-error-bg px-4 py-3 text-alert-error-fg">
        <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 flex-none" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{title}</span>
          <span>{body}</span>
        </div>
      </div>
      {action}
    </div>
  );
}
