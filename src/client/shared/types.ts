export const SUPPORTED_TYPES = [
  "Alliance",
  "Corporation",
  "Character",
  "Type",
  "Render",
] as const;
export type AssetType = (typeof SUPPORTED_TYPES)[number];
