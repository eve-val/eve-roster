
/**
 * The "data" column of the battles table.
 *
 * Contains everything you need to know about a battle (besides its ID).
 */
export interface BattleData {
  start: number,
  end: number,
  locations: number[],
  killmails: number[],
  participants: Participant[]
}

export interface Participant {
  id: string,
  shipId?: number,
  characterId?: number,
  corporationId?: number,
  allianceId?: number,
  factionId?: number,
  loss: {
    killmailId: number,
    value: number,
  } | null,
}
