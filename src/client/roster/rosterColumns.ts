import { Character, Account } from "../shared/types";

interface RenderColumn {
  label: string;
  width: number;
  margin?: number;
  numeric?: boolean;
  derivedFrom?: string[];
}

interface CharacterColumn extends RenderColumn {
  key: keyof Character;
  metaKey?: keyof Character;
  account?: false;
}
interface AccountColumn extends RenderColumn {
  key: keyof Omit<Account, "main">;
  metaKey?: keyof Omit<Account, "main" | "alts">;
  account: true;
}
export type Column = CharacterColumn | AccountColumn;

interface CharacterColumn extends RenderColumn {
  key: keyof Character | keyof Account;
  metaKey?: keyof Character | keyof Account;
  account?: boolean;
}

const columns: Column[] = [
  { label: "", key: "alertMessage", width: 35, margin: 0, derivedFrom: [] },
  {
    label: "Name",
    key: "name",
    width: 200,
    margin: 0,
    metaKey: "corporationName",
  },
  { label: "", key: "alts", width: 40, derivedFrom: [] },

  { label: "Citadel", key: "homeCitadel", width: 110, account: true },
  { label: "Timezone", key: "activeTimezone", width: 90, account: true },
  { label: "Last seen", key: "lastSeen", width: 110 },
  {
    label: "Kills",
    key: "killsInLastMonth",
    width: 60,
    numeric: true,
    metaKey: "killValueInLastMonth",
  },
  {
    label: "Losses",
    key: "lossesInLastMonth",
    width: 60,
    numeric: true,
    metaKey: "lossValueInLastMonth",
  },
];

export default columns;
