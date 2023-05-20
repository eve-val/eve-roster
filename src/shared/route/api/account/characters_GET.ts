export type Account_Characters_GET = CharacterDescription[];

export interface CharacterDescription {
  id: number;
  name: string;
  corporation: number;
  membership: string | null;
  accessTokenValid: boolean;
  isMain: boolean;
}
