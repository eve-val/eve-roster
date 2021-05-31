import { Character, Account } from "./types";

interface RenderColumn {
  label: string;
  width: number;
  margin?: number;
  numeric?: boolean;
  derivedFrom?: string[];
}

export interface CharacterColumn extends RenderColumn {
  account: false;
  key: keyof Character;
  metaKey?: keyof Character;
  sortable: true;
}
export interface AccountColumn extends RenderColumn {
  account: true;
  key: keyof Omit<Account, "main" | "alts" | "aggregate">;
  metaKey?: keyof Omit<Account, "main" | "alts" | "aggregate">;
  sortable: true;
}

export interface NonSortableAccountColumn extends RenderColumn {
  account: true;
  key: keyof Omit<Account, "main" | "aggregate">;
  metaKey?: keyof Omit<Account, "main" | "alts" | "aggregate">;
  sortable: false;
}

export function isSortable(col: Column): col is SortableColumn {
  return col.sortable;
}

export type SortableColumn = CharacterColumn | AccountColumn;
export type Column = SortableColumn | NonSortableAccountColumn;

const columns: readonly Column[] = [
  {
    label: "",
    key: "alertMessage",
    width: 35,
    margin: 0,
    derivedFrom: [],
    account: false,
    sortable: true,
  } as CharacterColumn,
  {
    label: "Name",
    key: "name",
    width: 200,
    margin: 0,
    metaKey: "corporationName",
    account: false,
    sortable: true,
  } as CharacterColumn,
  {
    label: "",
    key: "alts",
    width: 40,
    derivedFrom: [],
    account: true,
    sortable: false,
  } as NonSortableAccountColumn,

  {
    label: "Citadel",
    key: "homeCitadel",
    width: 110,
    account: true,
    sortable: true,
  } as AccountColumn,
  {
    label: "Timezone",
    key: "activeTimezone",
    width: 90,
    account: true,
    sortable: true,
  } as AccountColumn,
  {
    label: "Last seen",
    key: "lastSeen",
    width: 110,
    account: false,
    sortable: true,
  } as CharacterColumn,
  {
    label: "Kills",
    key: "killsInLastMonth",
    width: 60,
    numeric: true,
    metaKey: "killValueInLastMonth",
    account: false,
    sortable: true,
  } as CharacterColumn,
  {
    label: "Losses",
    key: "lossesInLastMonth",
    width: 60,
    numeric: true,
    metaKey: "lossValueInLastMonth",
    account: false,
    sortable: true,
  } as CharacterColumn,
] as const;

export default columns;
