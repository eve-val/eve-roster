/**
 * Metadata returned by ZKillboard related to killmails.
 */
export interface ZKillDescriptor {
  killmail_id: number;
  zkb: {
    locationID: number;
    hash: string;
    fittedValue: number;
    totalValue: number;
    points: number;
    npc: boolean;
    solo: boolean;
    awox: boolean;
  };
}
