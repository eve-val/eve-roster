import _ = require('underscore');

import { TemplateRule, FuncRule } from './TriageRule';
import { SrpVerdictStatus, SrpVerdictReason } from '../../../db/dao/enums';
import { GROUP_T1_INDUSTRIAL, GROUP_T1_FRIGATE, GROUP_T1_DESTROYER, GROUP_T1_COMBAT_BATTLECRUISER, GROUP_T1_ATTACK_BATTLECRUISER, GROUP_T1_BATTLESHIP, GROUP_LOGISTICS_FRIGATE, GROUP_ASSAULT_FRIGATE, GROUP_INTERCEPTOR, GROUP_COVERT_OPS, GROUP_STEALTH_BOMBER, GROUP_ELECTRONIC_ATTACK_SHIP, GROUP_INTERDICTOR, GROUP_COMMAND_DESTROYER, GROUP_LOGISTICS_CRUISER, GROUP_SHIP_HAC, GROUP_SHIP_HIC, GROUP_COMBAT_RECON, GROUP_FORCE_RECON, GROUP_COMMAND_SHIP, GROUP_BLACK_OPS, GROUP_MARAUDER, GROUP_BLOCKADE_RUNNER, GROUP_DST, GROUP_TACTICAL_DESTROYER, GROUP_STRATEGIC_CRUISER, GROUP_CAPSULE, GROUP_MOBILE_DEPOT, GROUP_MOBILE_TRACTOR_UNIT, GROUP_T1_CRUISER, GROUP_SUPPORT_FIGHTER, GROUP_LIGHT_FIGHTER, GROUP_HEAVY_FIGHTER, GROUP_SHUTTLE } from '../../../eve/constants/groups';
import { TYPE_GNOSIS, TYPE_HIGH_GRADE_TALONS, TYPE_LOW_GRADE_TALONS, TYPE_LOW_GRADE_GRAILS, TYPE_HIGH_GRADE_GRAILS, TYPE_LOW_GRADE_TALISMANS, TYPE_MID_GRADE_TALISMANS, TYPE_HIGH_GRADE_TALISMANS, TYPE_ARMORED_COMMAND_MINDLINK, TYPE_SHIELD_COMMAND_MINDLINK, TYPE_INFORMATION_COMMAND_MINDLINK, TYPE_SKIRMISH_COMMAND_MINDLINK, TYPE_IMPERIAL_NAVY_MINDLINK, TYPE_REPUBLIC_FLEET_MINDLINK, TYPE_FEDERATION_NAVY_MINDLINK, TYPE_CALDARI_NAVY_MINDLINK, TYPE_GUARDIAN, TYPE_TENGU, TYPE_SCORPION, TYPE_LEGION, TYPE_BHAALGORN, TYPE_DAMNATION, TYPE_LOKI, TYPE_VULTURE, TYPE_LESHACK, TYPE_DEVOTER, TYPE_LOW_GRADE_SLAVES, TYPE_MID_GRADE_SLAVES, TYPE_HIGH_GRADE_SLAVES } from '../../../eve/constants/types';
import { findWhere } from '../../../util/underscore';
import { MKT_GROUP_PIRATE_CRUISERS, MKT_GROUP_NAVY_FRIGATES, MKT_GROUP_NAVY_BATTLECRUISERS, MKT_GROUP_PIRATE_FRIGATES, MKT_GROUP_NAVY_CRUISERS, MKT_GROUP_PIRATE_BATTLESHIPS, MKT_GROUPS_T1_FRIGATES, MKT_GROUPS_T1_CRUISERS, MKT_GROUPS_T1_DESTROYERS, MKT_GROUP_TRIGLAVIAN_FRIGATES, MKT_GROUP_TRIGLAVIAN_CRUISERS, MKT_GROUP_TRIGLAVIAN_BATTLESHIPS } from '../../../eve/constants/marketGroups';
import { ZKillmail } from '../../../data-source/zkillboard/ZKillmail';


/**
 * SOUND-specific implementation of SRP rules. See the TRIAGE_RULES export
 * at the bottom of the file for the exported list.
 */


 /** These characters decline to receive SRP reimbursements. */
const OPT_OUT_CHARS = [
  867918844, // Dern Morrow
  912016079, // Cordy
  394078656, // Sujer Deluxe
  94297462,  // Replica Nt
];

const ACCOUNT_IS_OPT_OUT: FuncRule = {
  filter: {},
  discriminant: (killmail, extra) => {
    if (killmail.victim.character_id == undefined) {
      return;
    }
    if (OPT_OUT_CHARS.indexOf(killmail.victim.character_id) != -1
        || OPT_OUT_CHARS.indexOf(extra.mainCharacter!) != -1) {
      return [{
        status: SrpVerdictStatus.INELIGIBLE,
        reason: SrpVerdictReason.OPT_OUT,
        autoCommit: 'leader',
      }];
    }
  },
}

const DEPLOYABLES: TemplateRule = {
  filter: {
    groupId: [GROUP_MOBILE_DEPOT, GROUP_MOBILE_TRACTOR_UNIT],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    autoCommit: 'leader',
  }],
}

const T2_BATTLESHIPS: TemplateRule = {
  filter: {
    groupId: [GROUP_BLACK_OPS, GROUP_MARAUDER],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    autoCommit: 'leader',
  }],
};

const FIGHTERS: TemplateRule = {
  filter: {
    groupId: [GROUP_SUPPORT_FIGHTER, GROUP_LIGHT_FIGHTER, GROUP_HEAVY_FIGHTER],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    autoCommit: 'leader',
  }],
};

const SHUTTLES: TemplateRule = {
  filter: {
    groupId: [GROUP_SHUTTLE],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    autoCommit: 'leader',
  }]
}

const NPC_DEATH: TemplateRule = {
  filter: {
    tag: 'npc',
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NPC,
    autoCommit: 'leader',
  }],
}

const SOLO_DEATH: FuncRule = {
  filter: {
    tag: 'solo',
  },
  discriminant: (killmail, extra) => {
    // If larger than a T1 frigate or destroyer, ignore
    if (!_.contains(MKT_GROUPS_T1_FRIGATES, extra.shipMarketGroup)
        && !_.contains(MKT_GROUPS_T1_DESTROYERS, extra.shipMarketGroup)) {
      return [{
        status: SrpVerdictStatus.INELIGIBLE,
        reason: SrpVerdictReason.SOLO,
        // Don't autocommit here -- zkill's solo detection is not 100% reliable
      }];
    }
  },
}




const NAVY_FRIGATES: TemplateRule = {
  filter: { marketGroupId: [MKT_GROUP_NAVY_FRIGATES] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Navy frigate',
    payout: { kind: 'Market', fallback: million(10) },
  }],
};

const NAVY_CRUISERS: TemplateRule = {
  filter: { marketGroupId: [MKT_GROUP_NAVY_CRUISERS] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Navy cruiser',
    payout: { kind: 'Market', fallback: million(60) },
  }],
};

const NAVY_BATTLECRUISERS: TemplateRule = {
  filter: { marketGroupId: [MKT_GROUP_NAVY_BATTLECRUISERS] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Navy battlecruiser',
    payout: { kind: 'Market', fallback: million(160), },
  }],
};

const NAVY_BATTLESHIPS: TemplateRule = {
  filter: { marketGroupId: [MKT_GROUP_NAVY_FRIGATES] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Navy battleship',
    payout: { kind: 'Market', fallback: million(300) },
  }],
};




const PIRATE_FRIGATES: TemplateRule = {
  filter: {
    marketGroupId: [MKT_GROUP_PIRATE_FRIGATES, MKT_GROUP_TRIGLAVIAN_FRIGATES],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Pirate frigate',
    payout: { kind: 'Market', fallback: million(50) },
  }],
};

const PIRATE_CRUISERS: TemplateRule = {
  filter: {
    marketGroupId: [MKT_GROUP_PIRATE_CRUISERS, MKT_GROUP_TRIGLAVIAN_CRUISERS],
  },
  verdicts: [
    {
      status: SrpVerdictStatus.APPROVED,
      label: 'Pirate cruiser',
      payout: { kind: 'Market', fallback: million(210) },
    },
  ],
};

const PIRATE_BATTLESHIPS: TemplateRule = {
  filter: {
    marketGroupId: [
      MKT_GROUP_PIRATE_BATTLESHIPS,
      MKT_GROUP_TRIGLAVIAN_BATTLESHIPS,
    ],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Pirate battleship',
    payout: { kind: 'Market', fallback: million(350) },
  }],
};

const T1_FRIGATES: TemplateRule = {
  filter: { groupId: [GROUP_T1_FRIGATE] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 frigate',
    payout: { kind: 'Market', fallback: million(1) },
  }],
};

const T1_DESTROYERS: TemplateRule = {
  filter: { groupId: [GROUP_T1_DESTROYER] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 destroyer',
    payout: { kind: 'Market', fallback: million(2) },
  }],
};

const T1_CRUISERS: TemplateRule = {
  filter: { groupId: [GROUP_T1_CRUISER] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 cruiser',
    payout: { kind: 'Market', fallback: million(11) },
  }],
};

const GNOSIS: TemplateRule = {
  filter: { shipId: [TYPE_GNOSIS] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 combat BC',
    payout: { kind: 'Market', fallback: million(40) },
  }],
};

const T1_COMBAT_BCS: TemplateRule = {
  filter: { groupId: [GROUP_T1_COMBAT_BATTLECRUISER] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 combat BC',
    payout: { kind: 'Market', fallback: million(40) },
  }],
};

const T1_ATTACK_BCS: TemplateRule = {
  filter: { groupId: [GROUP_T1_ATTACK_BATTLECRUISER] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 combat BC',
    payout: { kind: 'Market', fallback: million(60) },
  }],
};

const T1_BATTLESHIPS: TemplateRule = {
  filter: { groupId: [GROUP_T1_BATTLESHIP] },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 battleship',
    payout: { kind: 'Market', fallback: million(150) },
  }],
};

const T1_INDUSTRIALS: TemplateRule = {
  filter: {
    groupId: [GROUP_T1_INDUSTRIAL],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T1 industrial',
    payout: { kind: 'Market', fallback: million(5) },
  }],
};

const LOGISTICS_FRIGATES: TemplateRule = {
  filter: {
    groupId: [GROUP_LOGISTICS_FRIGATE],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Logistics frigate',
    payout: { kind: 'Market', additional: million(50), fallback: million(70) }
  }],
};

const OTHER_T2_FRIGATES: TemplateRule = {
  filter: {
    groupId: [
      GROUP_ASSAULT_FRIGATE,
      GROUP_INTERCEPTOR,
      GROUP_COVERT_OPS,
      GROUP_STEALTH_BOMBER,
      GROUP_ELECTRONIC_ATTACK_SHIP,
    ],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T2 frigate',
    payout: { kind: 'Market', fallback: million(20) },
  }],
};

const INTERDICTORS: TemplateRule = {
  filter: {
    groupId: [GROUP_INTERDICTOR],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.CORP_PROVIDED,
    autoCommit: 'leader',
  }],
};

const COMMAND_DESTROYERS: TemplateRule = {
  filter: {
    groupId: [GROUP_COMMAND_DESTROYER],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Command destroyer',
    payout: { kind: 'Market', fallback: million(60) },
  }],
};

const LOGISTICS_CRUISER: TemplateRule = {
  filter: {
    groupId: [GROUP_LOGISTICS_CRUISER],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Logistics cruiser',
    payout: { kind: 'Market', additional: million(50), fallback: million(270) },
  }],
};

const OTHER_T2_CRUISER: TemplateRule = {
  filter: {
    groupId: [
      GROUP_SHIP_HAC,
      GROUP_SHIP_HIC,
      GROUP_COMBAT_RECON,
      GROUP_FORCE_RECON,
    ],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T2 cruiser',
    payout: { kind: 'Market', fallback: million(250) },
  }],
};

const COMMAND_SHIPS: TemplateRule = {
  filter: {
    groupId: [GROUP_COMMAND_SHIP],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Command ship',
    payout: { kind: 'Market', fallback: million(390) },
  }],
};

const T2_INDUSTRIALS: TemplateRule = {
  filter: {
    groupId: [GROUP_DST, GROUP_BLOCKADE_RUNNER],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'T2 industrial',
    payout: { kind: 'Market', fallback: million(200) },
  }],
};

const TACTICAL_DESTROYERS: TemplateRule = {
  filter: {
    groupId: [GROUP_TACTICAL_DESTROYER],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Tactical destroyer',
    payout: { kind: 'Market', fallback: million(40) },
  }],
};

const STRATEGIC_CRUISERS: TemplateRule = {
  filter: {
    groupId: [GROUP_STRATEGIC_CRUISER],
  },
  verdicts: [{
    status: SrpVerdictStatus.APPROVED,
    label: 'Strategic cruiser',
    payout: { kind: 'Market', additional: million(145), fallback: million(250) },
  }],
};

const GRAIL_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      shipId: [TYPE_GUARDIAN],
    }
  },
  discriminant: (killmail, extra) => {
    if (invMatchAll(killmail, TYPE_LOW_GRADE_GRAILS)
        || invMatchAll(killmail, TYPE_HIGH_GRADE_GRAILS)) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Grail implants',
        payout: {
          kind: 'Market',
          items: TYPE_LOW_GRADE_GRAILS,
          fallback: million(100),
        },
      }];
    }
  },
}

const TALON_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      shipId: [TYPE_TENGU, TYPE_SCORPION]
    }
  },
  discriminant: (killmail, extra) => {
    if (invMatchAll(killmail, TYPE_LOW_GRADE_TALONS)
        || invMatchAll(killmail, TYPE_HIGH_GRADE_TALONS)) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Talon implants',
        payout: { kind: 'Static', value: million(40) },
      }];
    }
  },
}

const TALISMAN_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      shipId: [TYPE_LEGION, TYPE_BHAALGORN],
    }
  },
  discriminant: (killmail, extra) => {
    if (invMatchAll(killmail, TYPE_LOW_GRADE_TALISMANS)
        || invMatchAll(killmail, TYPE_MID_GRADE_TALISMANS)
        || invMatchAll(killmail, TYPE_HIGH_GRADE_TALISMANS)) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Talisman implants',
        payout: { kind: 'Static', value: million(100) },
      }];
    }
  },
}

const BASIC_MINDLINK_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      groupId: [
        GROUP_COMMAND_SHIP,
        GROUP_STRATEGIC_CRUISER,
        GROUP_COMMAND_DESTROYER,
      ],
    }
  },
  discriminant: (killmail, extra) => {
    let implant = invMatchAny(killmail, [
      TYPE_ARMORED_COMMAND_MINDLINK,
      TYPE_SHIELD_COMMAND_MINDLINK,
      TYPE_INFORMATION_COMMAND_MINDLINK,
      TYPE_SKIRMISH_COMMAND_MINDLINK,
    ]);

    if (implant != undefined) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Mindlink',
        payout: { kind: 'Market', items: [implant], fallback: million(40) }
      }];
    }
  },
}

const NAVY_MINDLINK_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      groupId: [
        GROUP_COMMAND_SHIP,
        GROUP_STRATEGIC_CRUISER,
        GROUP_COMMAND_DESTROYER,
      ],
    }
  },
  discriminant: (killmail, extra) => {
    let implant = invMatchAny(killmail, [
      TYPE_IMPERIAL_NAVY_MINDLINK,
      TYPE_FEDERATION_NAVY_MINDLINK,
      TYPE_REPUBLIC_FLEET_MINDLINK,
      TYPE_CALDARI_NAVY_MINDLINK,
    ]);
    let payoutImplant: number | undefined = undefined;

    switch (implant) {
      case TYPE_IMPERIAL_NAVY_MINDLINK:
        payoutImplant = TYPE_INFORMATION_COMMAND_MINDLINK;
        break;
      case TYPE_FEDERATION_NAVY_MINDLINK:
        payoutImplant = TYPE_ARMORED_COMMAND_MINDLINK;
        break;
      case TYPE_REPUBLIC_FLEET_MINDLINK:
        payoutImplant = TYPE_SKIRMISH_COMMAND_MINDLINK;
        break;
      case TYPE_CALDARI_NAVY_MINDLINK:
        payoutImplant = TYPE_SHIELD_COMMAND_MINDLINK;
        break;
    }

    if (payoutImplant != undefined) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Mindlink',
        payout: {
          kind: 'Market',
          items: [payoutImplant],
          fallback: million(40),
        },
      }];
    }
  },
}

const SLAVE_IMPLANTS: FuncRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
    relatedLoss: {
      shipId: [TYPE_DAMNATION, TYPE_BHAALGORN, TYPE_LESHACK, TYPE_DEVOTER],
    }
  },
  discriminant: (killmail, extra) => {
    if (invMatchAll(killmail, TYPE_LOW_GRADE_SLAVES)
        || invMatchAll(killmail, TYPE_MID_GRADE_SLAVES)
        || invMatchAll(killmail, TYPE_HIGH_GRADE_SLAVES)) {
      return [{
        status: SrpVerdictStatus.APPROVED,
        label: 'Slave implants',
        payout: {
          kind: 'Static',
          value: million(200),
        },
      }];
    }
  },
}

const INELIGIBLE_IMPLANTS: TemplateRule = {
  filter: {
    groupId: [GROUP_CAPSULE],
  },
  verdicts: [{
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    autoCommit: 'leader',
  }],
}

function million(value: number) {
  return value * 1000000;
}

function invMatchAll(killmail: ZKillmail, items: number[]) {
  if (items.length == 0) {
    return true;
  }
  if (killmail.victim.items == undefined) {
    return false;
  }
  for (let i = 0; i < items.length; i++) {
    let id = items[i];
    if (findWhere(killmail.victim.items, { item_type_id: id }) == undefined) {
      return false;
    }
  }
  return true;
}

function invMatchAny(killmail: ZKillmail, items: number[]) {
  if (killmail.victim.items == undefined) {
    return undefined;
  }
  for (let i = 0; i < items.length; i++) {
    let id = items[i];
    if (findWhere(killmail.victim.items, { item_type_id: id }) != undefined) {
      return id;
    }
  }
  return undefined;
}

export const TRIAGE_RULES = [
  ACCOUNT_IS_OPT_OUT,
  DEPLOYABLES,
  T2_BATTLESHIPS,
  FIGHTERS,
  SHUTTLES,
  NPC_DEATH,
  SOLO_DEATH,

  // These and the pirate rules have to go before the T1 rules or the T1
  // rules will match them first (T1 and navy/pirate share the same group ID).
  NAVY_FRIGATES,
  NAVY_CRUISERS,
  NAVY_BATTLECRUISERS,
  NAVY_BATTLESHIPS,

  PIRATE_FRIGATES,
  PIRATE_CRUISERS,
  PIRATE_BATTLESHIPS,

  T1_FRIGATES,
  T1_DESTROYERS,
  T1_CRUISERS,
  GNOSIS,
  T1_COMBAT_BCS,
  T1_ATTACK_BCS,
  T1_BATTLESHIPS,
  T1_INDUSTRIALS,

  LOGISTICS_FRIGATES,
  OTHER_T2_FRIGATES,
  INTERDICTORS,
  COMMAND_DESTROYERS,
  LOGISTICS_CRUISER,
  OTHER_T2_CRUISER,
  COMMAND_SHIPS,
  T2_INDUSTRIALS,

  TACTICAL_DESTROYERS,
  STRATEGIC_CRUISERS,

  GRAIL_IMPLANTS,
  TALON_IMPLANTS,
  SLAVE_IMPLANTS,
  TALISMAN_IMPLANTS,
  BASIC_MINDLINK_IMPLANTS,
  NAVY_MINDLINK_IMPLANTS,

  INELIGIBLE_IMPLANTS,
];
