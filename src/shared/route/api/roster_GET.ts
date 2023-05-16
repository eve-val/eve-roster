export interface Roster_GET {
  columns: string[];
  rows: AccountJson[];
}

export interface Alertable {
  alertLevel?: number;
  alertMessage?: string;
}

export interface AccountJson extends Alertable {
  main: CharacterJson;
  alts: CharacterJson[];
  activeTimezone?: string | null;
  homeCitadel?: string | null;
}

export interface CharacterJson extends Alertable {
  id: number;
  name: string;
  corporationId: number;
  corporationName: string;

  lastSeen?: number;
  lastSeenLabel: string | null;
  killsInLastMonth: number | null;
  killValueInLastMonth: number | null;
  lossesInLastMonth: number | null;
  lossValueInLastMonth: number | null;
  siggyScore: number | null;
}
