"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { handleUnauthenticated } from "@/lib/query/handle-unauthenticated";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void handleUnauthenticated();
      }}
    >
      Sign out
    </Button>
  );
}
