import { jsonEndpoint } from '../../../express/protectedEndpoint';
import { dao } from '../../../dao';
import { MemberCorporation, GroupTitle } from '../../../dao/tables';
import { Tnex, DEFAULT_NUM } from '../../../tnex';

import { UserVisibleError } from '../../../error/UserVisibleError';
import { isCensored } from './_censor';

import { verify, optional, nullable, string, number, array, object, simpleMap, } from '../../../route-helper/schemaVerifier';
import { AccountSummary } from '../../../express/getAccountPrivs';
import { AccountPrivileges } from '../../../express/privileges';


export class Input {
  corporations = array({
    id: number(),
    membership: string(),
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
  const input = verify(req.body, inputSchema);
  return handleEndpoint(db, account, privs, input);
});

async function handleEndpoint(
    db: Tnex, account: AccountSummary, privs: AccountPrivileges, input: Input) {
  privs.requireWrite('serverConfig', false);
  verifyConfig(input);

  await db.asyncTransaction(async db => {
    await storeCorpConfigs(db, input.corporations);

    if (input.siggy && !isCensored(input.siggy.password)) {
      return dao.config.setSiggyCredentials(
          db, input.siggy.username, input.siggy.password);
    }

    await dao.log.logEvent(
        db,
        account.id,
        'MODIFY_SERVER_CONFIG',
        null,
        censorConfigForLogging(input));
  });

  return {};
}

function storeCorpConfigs(db: Tnex, corpConfigs: Input['corporations']) {
  let corpRows: MemberCorporation[] = corpConfigs.map(corp => {
    return {
      memberCorporation_corporationId: corp.id,
      memberCorporation_membership: corp.membership,
    }
  });
  let titleRows = extractTitleMappings(corpConfigs);
  return dao.config.setMemberCorpConfigs(db, corpRows, titleRows);
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

  return config;
}
