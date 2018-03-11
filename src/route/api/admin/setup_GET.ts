import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { Tnex } from '../../../tnex';
import { MemberCorporation, GroupTitle } from '../../../dao/tables';
import { SimpleMap } from '../../../util/simpleTypes';
import { censor } from './_censor';
import { Input as Output } from './setup_PUT';

type CorporationConfig = Output['corporations'][0];

export default jsonEndpoint((req, res, db, account, privs) => {
  privs.requireRead('serverConfig', false);

  return Promise.all([
    dao.config.getSiggyCredentials(db),
    getCorpConfig(db),
  ])
  .then(([siggyConfig, corpConfig]) => {
    corpConfig.sort(configSorter);

    if (corpConfig.length == 0) {
      corpConfig.push(EXAMPLE_CORP_CONFIG);
    }

    return {
      siggy: {
        username: siggyConfig.username,
        password: censor(siggyConfig.password, 0, 10),
      },
      corporations: corpConfig,
    };
  });
});

function getCorpConfig(db: Tnex) {
  return Promise.resolve()
  .then(() => dao.config.getMemberCorporations(db))
  .then(configRows => {
    return Promise.map(
        configRows,
        configRow => convertCorpConfigRowToJson(db, configRow));
  });
}

function convertCorpConfigRowToJson(
    db: Tnex,
    row: MemberCorporation,
    ): Promise<CorporationConfig> {
  return Promise.resolve()
  .then(() => {
    return dao.config.getCorpTitleToGroupMapping(
        db,
        row.memberCorporation_corporationId);
  })
  .then(mappingRows => {
    return {
      id: row.memberCorporation_corporationId,
      membership: row.memberCorporation_membership,
      // TODO_TS: Get rid of these after DB schema has been adjusted
      keyId: censor(denull(row.memberCorporation_apiKeyId).toString(), 2, 5),
      vCode: censor(denull(row.memberCorporation_apiVerificationCode), 4, 25),
      titles: createTitleMap(mappingRows),
    };
  });
}

function createTitleMap(
    mapRows: Pick<GroupTitle, "groupTitle_title" | "groupTitle_group">[]) {
  let map = {} as SimpleMap<string>;
  for (let row of mapRows) {
    map[row.groupTitle_title] = row.groupTitle_group;
  }
  return map;
}

function configSorter(a: CorporationConfig, b: CorporationConfig) {
  if (a.membership == 'full'
      && b.membership != 'full') {
    return -1;
  } else if (b.membership == 'full'
      && a.membership != 'full') {
    return 1;
  } else {
    return 0;
  }
}

const EXAMPLE_CORP_CONFIG = {
  id: 123456,
  membership: 'full/affiliated',
  keyId: '123456',
  vCode: 'tson12CJas97AhaoAHh912lOntqo81GlkdNQN...',
  titles: {
    'Staff': 'admin',
    'Line Member': 'full_member',
    'Greenie': 'provisional_member',
  },
};

function denull<T>(value: T | null): T {
  if (value == null) {
    throw new Error(`This value shouldn't be null.`);
  }
  return value;
}