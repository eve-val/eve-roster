/**
 * eve-swagger doesn't have any Typescript bindings yet, so we define them here
 * as part of the `Swagger` interface below. Whenever you need to use a new part
 * of the swagger API, add the typed version of it here.
 */

const swagger = require('eve-swagger');

const swaggerInstance = swagger({
  agent: process.env.USER_AGENT || 'SOUND Roster App',
});

export interface Swagger {
  characters(id: number, accessToken?: string): CharacterSection,

  corporations: {
    (id: number): {
      info(): Promise<Corporation>,
    },
    names(ids: number[]): Promise<{id: number, name: string}[]>,
  }
}

interface CharacterSection {
  info(): Promise<PublicCharacterInfo>,
  location(): Promise<Location>,
  ship(): Promise<Ship>,
  skillqueue(): Promise<SkillQueueEntry[]>,
  skills(): Promise<{ skills: SkillsheetEntry[]}>,
}

export interface SkillQueueEntry {
  skill_id: number,
  queue_position: number,
  finished_level: number,
  training_start_sp: number,
  level_start_sp: number,
  level_end_sp: number,
  start_date?: string,
  finish_date?: string,
}

export interface SkillsheetEntry {
  skill_id: number,
  current_skill_level: number,
  skillpoints_in_skill: number,
}

export interface Corporation {
  corporation_name: string,
  alliance_id: number,
  ticker: string,
}

export interface PublicCharacterInfo {
  alliance_id: number,
  ancestry_id: number,
  birthday: string,
  bloodline_id: number,
  corporation_id: number,
  description: string,
  gender: string,
  name: string,
  race_id: number,
  security_status: number,
}

export interface Location {
  solar_system_id: number,
  structure_id?: number,
  station_id?: number,
}

export interface Ship {
  ship_name: string,
  ship_type_id: number,
  ship_item_id: number,
}

export default swaggerInstance as Swagger;
