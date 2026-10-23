"use client";

import { Button } from "@/components/ui/button";
import { PAGE_ERROR_COPY, TRY_AGAIN, pageTitle } from "./members-copy";
import { LoadErrorCard, mainClass } from "./member-states";

export default function MembersError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className={mainClass}>
      <h1 className="text-2xl leading-8 font-semibold tracking-tight text-pretty">
        {pageTitle(null)}
      </h1>
      <LoadErrorCard
        title={PAGE_ERROR_COPY.title}
        body={PAGE_ERROR_COPY.body}
        action={
          <Button type="button" variant="outline" onClick={() => retry()}>
            {TRY_AGAIN}
          </Button>
        }
      />
    </main>
  );
}
