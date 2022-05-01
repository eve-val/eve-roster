import { ZKillmail } from "../../data-source/zkillboard/ZKillmail.js";
import { Battle, Killmail } from "../../db/tables.js";
import { Participant } from "./BattleData.js";
import { Transform, TransformCallback } from "../../util/stream/Transform.js";

/**
 * Transform stream that accepts a stream of killmails and outputs a stream of
 * "battles".
 *
 * Battles are essentially just clusters of related killmails.
 *
 */
export class BattleCreator extends Transform<Killmail, BattleResult> {
  private readonly _battles = new Set<InternalBattle>();
  private readonly _assocWindow: number;

  constructor(initialBattles: Battle[], maxAssociationWindow: number) {
    super({
      objectMode: true,
    });
    this._assocWindow = maxAssociationWindow;

    for (const battleRow of initialBattles) {
      this._battles.add(battleRowToInternalBattle(battleRow));
    }
  }

  public _transform(
    chunk: any,
    encoding: string,
    callback: TransformCallback<BattleResult>
  ) {
    try {
      this._transformChunk(chunk);
      callback();
    } catch (err) {
      this.emit("error", err);
    }
  }

  private _transformChunk(chunk: Pick<Killmail, "km_timestamp" | "km_data">) {
    const killmail = chunk.km_data;

    this._flushBattlesOutsideOfWindow(chunk.km_timestamp);

    const participants = extractParticipants(killmail);
    const involvedBattles: InternalBattle[] = [];
    for (const battle of this._battles) {
      for (const participant of participants) {
        if (
          isMatchableParticipant(participant) &&
          battle.participants.has(participant.id)
        ) {
          involvedBattles.push(battle);
          break;
        }
      }
    }
    const finalBattle = this._fuseBattles(involvedBattles);

    if (!finalBattle.killmails.has(killmail.killmail_id)) {
      finalBattle.start = Math.min(finalBattle.start, chunk.km_timestamp);
      finalBattle.end = Math.max(finalBattle.end, chunk.km_timestamp);
      finalBattle.killmails.add(killmail.killmail_id);
      finalBattle.locations.add(killmail.solar_system_id);
      for (const participant of participants) {
        addParticipant(finalBattle, participant);
      }
    }
  }

  public _flush(callback: TransformCallback<BattleResult>) {
    try {
      this._flushRemainingBattles();
      callback();
    } catch (err) {
      this.emit("error", err);
    }
  }

  private _flushRemainingBattles() {
    for (const battle of this._battles) {
      this._flushBattle(battle);
    }
  }

  private _flushBattlesOutsideOfWindow(mostRecentKmTimestamp: number) {
    const doneBattles: InternalBattle[] = [];
    for (const battle of this._battles) {
      if (mostRecentKmTimestamp - battle.start > this._assocWindow) {
        doneBattles.push(battle);
      }
    }
    for (const doneBattle of doneBattles) {
      this._flushBattle(doneBattle);
    }
  }

  private _fuseBattles(battles: InternalBattle[]) {
    let outBattle: InternalBattle;

    if (battles.length == 0) {
      outBattle = {
        id: null,
        start: Number.MAX_SAFE_INTEGER,
        end: Number.MIN_SAFE_INTEGER,
        killmails: new Set<number>(),
        locations: new Set<number>(),
        participants: new Map<string, Participant>(),
      };
    } else if (battles.length == 1) {
      outBattle = battles[0];
    } else {
      outBattle = battles[0];
      for (let i = 1; i < battles.length; i++) {
        const subBattle = battles[i];
        joinBattles(outBattle, subBattle);
        this._discardBattle(subBattle);
      }
    }

    this._battles.add(outBattle);
    return outBattle;
  }

  private _flushBattle(battle: InternalBattle) {
    this._battles.delete(battle);
    this.push({
      type: "created",
      battle: battle,
    });
  }

  private _discardBattle(battle: InternalBattle) {
    this._battles.delete(battle);
    if (battle.id != null) {
      this.push({
        type: "deleted",
        battleId: battle.id,
      });
    }
  }
}

function joinBattles(left: InternalBattle, right: InternalBattle) {
  left.start = Math.min(left.start, right.start);
  left.end = Math.max(left.end, right.end);
  for (const killmail of right.killmails) {
    left.killmails.add(killmail);
  }
  for (const location of right.locations) {
    left.locations.add(location);
  }
  for (const participant of right.participants.values()) {
    addParticipant(left, participant);
  }
}

function addParticipant(battle: InternalBattle, participant: Participant) {
  const existing = battle.participants.get(participant.id);
  if (existing == undefined) {
    battle.participants.set(participant.id, participant);
  } else {
    if (existing.loss == null && participant.loss != null) {
      existing.loss = participant.loss;
    }
  }
}

function extractParticipants(killmail: ZKillmail) {
  const participants: Participant[] = [];

  const victim = buildParticipant(killmail.victim);
  victim.loss = {
    killmailId: killmail.killmail_id,
    value: killmail.zkb.totalValue,
  };

  participants.push(victim);
  for (const attacker of killmail.attackers) {
    participants.push(buildParticipant(attacker));
  }

  return participants;
}

function buildParticipant(entity: KillmailEntity): Participant {
  const id =
    `${entity.ship_type_id},` +
    `${entity.character_id || entity.corporation_id || entity.faction_id}`;
  return {
    id: id,
    shipId: entity.ship_type_id,
    characterId: entity.character_id,
    corporationId: entity.corporation_id,
    allianceId: entity.alliance_id,
    factionId: entity.faction_id,
    loss: null,
  };
}

function isMatchableParticipant(p: Participant) {
  // Heuristic to detect whether the participant is a player
  return p.characterId != undefined && p.factionId == undefined;
}

interface KillmailEntity {
  ship_type_id?: number;
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
}

function battleRowToInternalBattle(row: Battle): InternalBattle {
  const battle: InternalBattle = {
    id: row.battle_id,
    start: row.battle_start,
    end: row.battle_end,
    killmails: new Set<number>(row.battle_data.killmails),
    locations: new Set<number>(row.battle_data.locations),
    participants: new Map<string, Participant>(),
  };

  for (const participant of row.battle_data.participants) {
    battle.participants.set(participant.id, participant);
  }

  return battle;
}

export interface InternalBattle {
  id: number | null;
  start: number;
  end: number;
  killmails: Set<number>;
  locations: Set<number>;
  participants: Map<string, Participant>;
}

export type BattleResult = CreatedBattle | DeletedBattle;

export interface CreatedBattle {
  type: "created";
  battle: InternalBattle;
}

export interface DeletedBattle {
  type: "deleted";
  battleId: number;
}
