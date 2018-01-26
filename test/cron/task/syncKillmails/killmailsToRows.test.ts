import moment = require('moment');

import { killmailsToRows } from '../../../../src/cron/task/syncKillmails/killmailsToRows';
import { ZKillmail } from '../../../../src/data-source/zkillboard/ZKillmail';
import { KillmailType, HullCategory } from '../../../../src/dao/enums';
import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from '../../../../src/eve/constants/types';


const CHAR_A = 47;
const CHAR_B = 66;
const SOURCE_CORP = 47;
const TEN_MINUTES = moment.duration(10, 'minutes').asMilliseconds();


test('Mails within window are associated', () => {
  const mails = [
    killmail({
      killmail_id: 0,
      killmail_time: '2018-01-14T05:51:13Z',
      victim: {
        character_id: CHAR_A,
        ship_type_id: 99,
      },
    }),
    killmail({
      killmail_id: 1,
      killmail_time: '2018-01-14T05:51:14Z',
      victim: {
        character_id: CHAR_B,
      },
    }),
    killmail({
      killmail_id: 2,
      killmail_time: '2018-01-14T05:51:15Z',
      victim: {
        character_id: CHAR_A,
        ship_type_id: TYPE_CAPSULE,
      },
    }),
  ];

  const rows = killmailsToRows(mails, SOURCE_CORP, TEN_MINUTES);

  expect(rows[0].km_relatedLoss).toBe(2);
  expect(rows[2].km_relatedLoss).toBe(0);
});

test('Mails outside of window are not associated', () => {
  const mails = [
    killmail({
      killmail_id: 0,
      killmail_time: '2018-01-14T05:51:13Z',
      victim: { character_id: CHAR_A, ship_type_id: TYPE_CAPSULE, }
    }),
    killmail({
      killmail_id: 2,
      killmail_time: '2018-01-14T06:01:25Z',
      victim: { character_id: CHAR_A, }
    }),
  ];

  const rows = killmailsToRows(mails, SOURCE_CORP, TEN_MINUTES);

  expect(rows[0].km_relatedLoss).toBe(null);
  expect(rows[1].km_relatedLoss).toBe(null);
});

test(`Association: first loss can't be a capsule`, () => {
  const mails = [
    killmail({
      killmail_id: 0,
      killmail_time: '2018-01-14T05:51:13Z',
      victim: { character_id: CHAR_A, ship_type_id: TYPE_CAPSULE, }
    }),
    killmail({
      killmail_id: 2,
      killmail_time: '2018-01-14T06:01:25Z',
      victim: { character_id: CHAR_A, ship_type_id: TYPE_CAPSULE, }
    }),
  ];

  const rows = killmailsToRows(mails, SOURCE_CORP, TEN_MINUTES);

  expect(rows[0].km_relatedLoss).toBe(null);
  expect(rows[1].km_relatedLoss).toBe(null);
});

test(`Association: second loss must be a capsule`, () => {
  const mails = [
    killmail({
      killmail_id: 0,
      killmail_time: '2018-01-14T05:51:13Z',
      victim: { character_id: CHAR_A, ship_type_id: 99, }
    }),
    killmail({
      killmail_id: 2,
      killmail_time: '2018-01-14T06:01:25Z',
      victim: { character_id: CHAR_A, ship_type_id: 33, }
    }),
  ];

  const rows = killmailsToRows(mails, SOURCE_CORP, TEN_MINUTES);

  expect(rows[0].km_relatedLoss).toBe(null);
  expect(rows[1].km_relatedLoss).toBe(null);
});

test('Row is generated properly', () => {
  const mail = killmail({
    killmail_id: 23,
    killmail_time: '2018-01-14T05:51:14Z',
    victim: { character_id: 47, },
  });
  const row = killmailsToRows([mail], SOURCE_CORP, TEN_MINUTES)[0];

  expect(row).toEqual({
    km_id: 23,
    km_character: 47,
    km_timestamp: 1515909074000,
    km_type: KillmailType.LOSS,
    km_hullCategory: HullCategory.SHIP,
    km_relatedLoss: null,
    km_sourceCorporation: SOURCE_CORP,
    km_data: mail,
  });
});

test('Hull category is properly set for capsules', () => {
  let mail = killmail({ victim: { ship_type_id: TYPE_CAPSULE } });
  let row = killmailsToRows([mail], SOURCE_CORP, TEN_MINUTES)[0];
  expect(row.km_hullCategory).toBe(HullCategory.CAPSULE);

  mail = killmail({ victim: { ship_type_id: TYPE_CAPSULE_GENOLUTION } });
  row = killmailsToRows([mail], SOURCE_CORP, TEN_MINUTES)[0];
  expect(row.km_hullCategory).toBe(HullCategory.CAPSULE);
});

test(`Out of order mails throws error`, () => {
  const mails = [
    killmail({
      killmail_time: '2018-01-14T05:51:13Z',
    }),
    killmail({
      killmail_time: '2018-01-14T04:01:25Z',
    }),
  ];

  expect(() => {
    killmailsToRows(mails, SOURCE_CORP, TEN_MINUTES)
  }).toThrow();
});


/**
 * Generates a killmail based on {{source}}, filling in the rest of the fields
 * with default values.
 */
function killmail(source: PartialZkillmail): ZKillmail {
  return {
    killmail_id: source.killmail_id || 0,
    killmail_time: source.killmail_time || '1970-01-01 00:00:00',
    victim: {
      damage_taken: 0,
      ship_type_id: source.victim && source.victim.ship_type_id || 0,
      character_id: source.victim && source.victim.character_id || 0,
      corporation_id: 0,
      alliance_id: undefined,
      items: [],
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    attackers: [{
      final_blow: true,
      damage_done: 0,
      ship_type_id: 0,
      security_status: 0,
      character_id: 0,
      corporation_id: 0,
      alliance_id: 0,
      weapon_type_id: 0,
    }],
    solar_system_id: 0,
    zkb: {
      locationID: 0,
      hash: '',
      fittedValue: 0,
      totalValue: 0,
      points: 0,
      npc: false,
      solo: false,
      awox: false,
    }
  };
}

interface PartialZkillmail {
  killmail_id?: number,
  killmail_time?: string,
  victim?: {
    character_id?: number,
    ship_type_id?: number,
  }
}
