import { SimpleNumMap } from "../../../shared/util/simpleTypes.js";
import { EsiKillmail } from "../../data-source/esi/EsiKillmail.js";

/**
 * Meta-object created by adding metadata to an {@link EsiKillmail}.
 *
 * The structure of this object exists largely for historical reasons. This
 * used to be the format that ZKillboard returned when querying its APIs.
 * However, (a) ZKill doesn't use that format anymore and (b) we don't use ZKill
 * anymore. Migrating the codebase to use a more separated format is an
 * oustanding project.
 */
export type AnnotatedKillmail = EsiKillmail & KillmailAnnotations;

/**
 * Metadata returned by ZKillboard related to killmails.
 */
export interface KillmailAnnotations {
  killmail_id: number;
  zkb: {
    hash: string;
    fittedValue: number;
    totalValue: number;
    prices?: SimpleNumMap<number>;
    npc: boolean;
    solo?: boolean;
  };
}
