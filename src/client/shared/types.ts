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

export interface Character {
  id: number;
  name: string;
  accessTokenValid: boolean;
  membership: string;
  lastSeen: number;
  activityScore?: number;
  logonDate?: null | number;
  logoffDate?: null | number;
  siggyScore?: null | number;
  killsInLastMonth?: null | number;
  totalSp?: number;
}
export interface Account {
  main: Character;
  alts: Character[];
  aggregate?: Character;
}
