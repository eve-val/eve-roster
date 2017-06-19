import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { MemberCorporation, GroupTitle } from '../../../dao/tables';
import { Tnex, DEFAULT_NUM } from '../../../tnex';
import { findWhere } from '../../../util/underscore';

import { UserVisibleError } from '../../../error/UserVisibleError';
import { censor, isCensored } from './_censor';

import { verify, optional, nullable, string, number, array, object, simpleMap, } from '../../../route-helper/schemaVerifier';


export class Input {
  corporations = array({
    id: number(),
    membership: string(),
    keyId: string(),
    vCode: string(),
    titles: optional(simpleMap(string()))
  });

  siggy = optional(object({
    username: nullable(string()),
    password: nullable(string()),
  }))
}
const inputSchema = new Input();

export interface Output {}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireWrite('serverConfig', false);

  let config = verify(req.body, inputSchema);

  return db.transaction(db => {
    return Promise.resolve()
    .then(() => {
      verifyConfig(config);
      return storeCorpConfigs(db, config.corporations);
    })
    .then(() => {
      if (config.siggy && !isCensored(config.siggy.password)) {
        return dao.config.setSiggyCredentials(
            db, config.siggy.username, config.siggy.password);
      }
    })
    .then(() => {
      return dao.log.logEvent(
          db,
          account.id,
          'MODIFY_SERVER_CONFIG',
          null,
          censorConfigForLogging(config));
    })
    .then(() => {
      return {};
    });
  });
});

function storeCorpConfigs(db: Tnex, corpConfigs: Input['corporations']) {
  return Promise.resolve()
  .then(() => {
    return dao.config.getMemberCorporations(db);
  })
  .then(existingConfigs => {
    let processedConfigs = corpConfigs.map(newConfig => {
      return processNewCorpConfig(
          newConfig,
          findWhere(
              existingConfigs,
              { memberCorporation_corporationId: newConfig.id }));
    });
    let titleMappings = extractTitleMappings(corpConfigs);
    return dao.config.setMemberCorpConfigs(db, processedConfigs, titleMappings);
  });
}

function processNewCorpConfig(
    newConfig: Input['corporations'][0],
    existingConfig: MemberCorporation | undefined,
    ) {
  let processed = Object.assign({}, existingConfig) as MemberCorporation;
  processed.memberCorporation_corporationId = newConfig.id;
  processed.memberCorporation_membership = newConfig.membership;
  if (!isCensored(newConfig.keyId)) {
    processed.memberCorporation_apiKeyId = parseInt(newConfig.keyId);
  }
  if (!isCensored(newConfig.vCode)) {
    processed.memberCorporation_apiVerificationCode = newConfig.vCode;
  }

  return processed;
}

function extractTitleMappings(corpConfigs: Input['corporations']) {
  let mappings = [] as GroupTitle[];
  for (let corpConfig of corpConfigs) {
    if (corpConfig.titles == undefined) {
      continue;
    }
    for (let title in corpConfig.titles) {
      mappings.push({
        groupTitle_id: DEFAULT_NUM,
        groupTitle_corporation: corpConfig.id,
        groupTitle_title: title,
        groupTitle_group: corpConfig.titles[title],
      });
    }
  }
  return mappings;
}


function verifyConfig(config: Input) {
  let hasAtLeastOnePrimary = false;
  for (let corp of config.corporations) {
    hasAtLeastOnePrimary = hasAtLeastOnePrimary || corp.membership == 'full';
  }
  if (config.corporations.length > 0 && !hasAtLeastOnePrimary) {
    die('At least one corporation must be marked \'membership: "full"\'.');
  }
}

function die(message: string, relatedObj?: object) {
  if (relatedObj) {
    message += ` In object ${JSON.stringify(relatedObj, null, 2)}`;
  }
  throw new UserVisibleError(message);
}

const SENSITIVE_STR_CHANGED_INDICATOR = '___CHANGED___';

function censorConfigForLogging(config: Input) {
  if (config.siggy && !isCensored(config.siggy.password)) {
    config.siggy.password = SENSITIVE_STR_CHANGED_INDICATOR;
  }
  for (let corpConfig of config.corporations) {
    if (!isCensored(corpConfig.keyId)) {
      corpConfig.keyId = SENSITIVE_STR_CHANGED_INDICATOR;
    }
    if (!isCensored(corpConfig.vCode)) {
      corpConfig.vCode = SENSITIVE_STR_CHANGED_INDICATOR;
    }
  }

  return config;
}
