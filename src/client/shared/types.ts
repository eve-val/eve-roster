export const SUPPORTED_TYPES = [
  "Alliance",
  "alliance",
  "Corporation",
  "corporation",
  "Character",
  "character",
  "Type",
  "type",
  "Render",
  "render",
] as const;
export type AssetType = (typeof SUPPORTED_TYPES)[number];
