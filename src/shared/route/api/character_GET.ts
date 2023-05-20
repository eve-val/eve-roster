import { SimpleMap, SimpleNumMap } from "../../util/simpleTypes.js";

export interface Character_GET {
  character: Character;
  account: Account;
  access: SimpleMap<number>;
  timezones?: string[];
  citadels?: string[];
  names: SimpleNumMap<string>;
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
  activeTimezone?: string;
  citadelName?: string;
  main?: CharacterRef;
  alts?: CharacterRef[];
}

export interface CharacterRef {
  id: number;
  name: string;
}
