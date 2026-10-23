import { signOut } from "@/app/actions";
import { getQueryClient } from "./get-query-client";

let inProgress = false;

export async function handleUnauthenticated() {
  if (inProgress) {
    return;
  }
  inProgress = true;
  getQueryClient().clear();
  await signOut().catch(() => undefined);
  window.location.replace("/login");
}
