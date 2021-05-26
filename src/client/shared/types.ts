export const SUPPORTED_TYPES = [
  "Alliance",
  "Corporation",
  "Character",
  "Type",
  "Render",
] as const;
export type AssetType = typeof SUPPORTED_TYPES[number];

type Dictionary<T> = { [key: string]: T };
type Nullable<T> = T | null | undefined;
export type CssStyleObject = Partial<CSSStyleDeclaration> &
  Dictionary<Nullable<string>>;

import * as serverTypes from "../../route/api/roster";

export interface Character extends serverTypes.CharacterJson {
  totalSp?: number;
  activityScore?: number;
}

export interface Account extends serverTypes.AccountJson {
  aggregate: Character;
}
