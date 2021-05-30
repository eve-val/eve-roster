import { Character, Account } from "./types";

interface RenderColumn {
  label: string;
  width: number;
  margin?: number;
  numeric?: boolean;
  derivedFrom?: string[];
  sortable: boolean;
}

export interface CharacterColumn extends RenderColumn {
  account: false;
  key: keyof Character;
  metaKey?: keyof Character;
}
export interface AccountColumn extends RenderColumn {
  account: true;
  key: keyof Omit<Account, "main" | "aggregate">;
  metaKey?: keyof Omit<Account, "main" | "alts" | "aggregate">;
}
export type Column = CharacterColumn | AccountColumn;

const columns: Column[] = [
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
  } as CharacterColumn,
  {
    label: "",
    key: "alts",
    width: 40,
    derivedFrom: [],
    account: true,
    sortable: false,
  } as AccountColumn,

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
];

export default columns;
