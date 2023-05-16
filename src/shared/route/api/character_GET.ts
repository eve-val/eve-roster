import { SimpleMap } from "../../util/simpleTypes.js";

export interface Character_GET {
  character: Character;
  account: Account;
  access: SimpleMap<number>;
  timezones?: string[];
  citadels?: string[];
}

export interface Character {
  name: string;
  corporationId: number;
  titles: string[];
  totalSp: number;
}

export interface Account {
  id: number | null;
  groups: string[];
  activeTimezone?: string | null;
  citadelName?: string | null;
  main?: CharacterRef;
  alts?: CharacterRef[];
}

export interface CharacterRef {
  id: number;
  name: string;
}
