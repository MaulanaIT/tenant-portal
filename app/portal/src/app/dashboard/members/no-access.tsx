import { UsersIcon } from "lucide-react";
import { NO_TENANTS_COPY, pageTitle } from "./members-copy";
import { NoAccessCard, StateCard, mainClass } from "./member-states";
import { TitleBlock } from "./title-block";

export function NoAccess() {
  return (
    <main className={mainClass}>
      <TitleBlock title={pageTitle(null)} summary="" />
      <NoAccessCard />
    </main>
  );
}

export function NoTenants() {
  return (
    <main className={mainClass}>
      <TitleBlock title={pageTitle(null)} summary="" />
      <StateCard icon={UsersIcon} title={NO_TENANTS_COPY.title} />
    </main>
  );
}
