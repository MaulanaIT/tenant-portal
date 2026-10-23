import {
  parseAsString,
  parseAsStringLiteral,
  throttle,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { DEFAULT_SORT, MEMBER_SORTS, ROLE_FILTERS } from "./member-filters";

export const MEMBER_VIEWS = ["list", "chart"] as const;

export type MemberView = (typeof MEMBER_VIEWS)[number];

const viewParser = parseAsStringLiteral(MEMBER_VIEWS).withDefault("list");

const membersParams = {
  view: viewParser,
  q: parseAsString.withDefault("").withOptions({ limitUrlUpdates: throttle(200) }),
  role: parseAsStringLiteral(ROLE_FILTERS).withDefault("all"),
  sort: parseAsStringLiteral(MEMBER_SORTS).withDefault(DEFAULT_SORT),
};

export function useMembersParams() {
  return useQueryStates(membersParams);
}

export function useMemberView() {
  return useQueryState("view", viewParser);
}
