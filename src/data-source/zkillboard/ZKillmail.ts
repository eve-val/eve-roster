import { EsiKillmail } from "../esi/EsiKillmail";

/**
 * Meta-object created by joining the output of ZKill and ESI. This used to be
 * the format that ZKillboard returned, but has since switched to only returning
 * ZKillDescriptors. Most internal code was written expecting the old
 * ZKillmail format, so we stitch the two data sources together and store them
 * as a single object.
 */
export type ZKillmail = EsiKillmail & ZKillDescriptor;

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
