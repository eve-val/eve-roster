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
