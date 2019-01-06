import { jsonEndpoint } from '../../../infra/express/protectedEndpoint';
import { dao } from '../../../db/dao';
import { MemberCorporation, GroupTitle } from '../../../db/tables';
import { Tnex, DEFAULT_NUM } from '../../../db/tnex';

import { UserVisibleError } from '../../../error/UserVisibleError';
import { isCensored } from './_censor';

import { verify, optional, nullable, string, number, array, object, simpleMap, } from '../../../util/express/schemaVerifier';
import { AccountSummary } from '../../../infra/express/getAccountPrivs';
import { AccountPrivileges } from '../../../infra/express/privileges';
import { fetchEsi } from '../../../data-source/esi/fetch/fetchEsi';
import { ESI_CORPORATIONS_$corporationId } from '../../../data-source/esi/endpoints';


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

async function storeCorpConfigs(db: Tnex, corpConfigs: Input['corporations']) {
  const work = [] as Promise<MemberCorporation>[];
  for (let corp of corpConfigs) {
    work.push(
      fetchEsi(ESI_CORPORATIONS_$corporationId, { corporationId: corp.id })
      .then(corpInfo => {
        return {
          mcorp_corporationId: corp.id,
          mcorp_membership: corp.membership,
          mcorp_name: corpInfo.name,
          mcorp_ticker: corpInfo.ticker,
        };
      })
    );
  }

  const corpRows = await Promise.all(work);

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
