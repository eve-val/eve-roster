import moment, { Moment } from "moment";
import { fetchEsi } from "../../../data-source/esi/fetch/fetchEsi.js";
import { flow } from "../../../util/flow/flow.js";
import { Tnex, UpdatePolicy } from "../../../db/tnex/Tnex.js";
import { JobLogger } from "../../../infra/taskrunner/Job.js";
import {
  ESI_CORPORATIONS_$corporationId_KILLMAILS_RECENT,
  ESI_KILLMAILS_$killmailId_$killmailHash,
} from "../../../data-source/esi/endpoints.js";
import { dao } from "../../../db/dao.js";
import { runAsDirector } from "../../../data-source/accessToken/runAsDirector.js";
import { EsiEntity } from "../../../data-source/esi/EsiEntity.js";
import { EsiScope } from "../../../data-source/esi/EsiScope.js";
import {
  Attacker,
  EsiKillmail,
} from "../../../../shared/types/esi/EsiKillmail.js";
import { paginatedEsiEndpoint } from "../../../data-source/esi/flow/paginatedEsiEndpoint.js";
import { fetchAverageMarketPrices } from "../../../data-source/esi/market/fetchAverageMarketPrices.js";
import { checkNotNil } from "../../../../shared/util/assert.js";
import { AnnotatedKillmail } from "../../../../shared/types/killmail/AnnotatedKillmail.js";
import { killmailToRow } from "./killmailToRow.js";

export async function fetchKillmails(
  db: Tnex,
  job: JobLogger,
  corp: EsiEntity,
  fetchAfter: Moment,
) {
  return await db.asyncTransaction(async (db) => {
    const result = await fetchKillmailsWithinTransaction(
      db,
      job,
      corp,
      fetchAfter,
    );
    return result;
  });
}

async function fetchKillmailsWithinTransaction(
  db: Tnex,
  job: JobLogger,
  corp: EsiEntity,
  fetchAfter: Moment,
) {
  const scopes = [EsiScope.CORP_READ_KILLMAILS];

  return await runAsDirector(db, job, corp, scopes, (token) => {
    let earliestTimestamp = moment();
    let latestTimestamp = fetchAfter;
    let fetchedCount = 0;
    let newCount = 0;

    return flow
      .from(
        paginatedEsiEndpoint(ESI_CORPORATIONS_$corporationId_KILLMAILS_RECENT, {
          corporationId: corp.id,
          _token: token,
        }),
      )
      .mapParallel(10, (value) => {
        return fetchEsi(
          ESI_KILLMAILS_$killmailId_$killmailHash,
          {
            killmailId: value.killmail_id,
            killmailHash: value.killmail_hash,
          },
          2,
        ).then((killmail) => {
          return { hash: value.killmail_hash, killmail };
        });
      })
      .map(async ({ hash, killmail }) => {
        fetchedCount++;
        return {
          km: killmail,
          timestamp: moment(killmail.killmail_time),
          metadata: await generateMetadata(hash, killmail),
        };
      })
      .while((value) => value.timestamp.isAfter(fetchAfter))
      .observe((value) => {
        latestTimestamp = moment.max(latestTimestamp, value.timestamp);
        earliestTimestamp = moment.min(earliestTimestamp, value.timestamp);

        job.info(
          `Processing killmail ${value.km.killmail_id}` +
            ` ${value.km.killmail_time}` +
            ` totalValue=${value.metadata.totalValue}` +
            ` fittedValue=${value.metadata.fittedValue}` +
            ` npc=${value.metadata.npc}`,
        );
      })
      .batch(20)
      .observe(async (batch) => {
        const rows = batch.map((value) => {
          const zkm: AnnotatedKillmail = {
            ...value.km,
            zkb: value.metadata,
          };
          return killmailToRow(zkm);
        });

        newCount += await dao.killmail.upsertKillmails(db, rows, {
          km_relatedLoss: UpdatePolicy.PRESERVE_EXISTING,
          km_data: UpdatePolicy.PRESERVE_EXISTING,
          km_processed: UpdatePolicy.PRESERVE_EXISTING,
        });
      })
      .run()
      .then(() => {
        return {
          earliestTimestamp,
          latestTimestamp,
          fetchedCount,
          newCount,
        };
      });
  });
}

async function generateMetadata(hash: string, killmail: EsiKillmail) {
  const prices = await getFreshItemPrices(killmail);

  const hullValue = checkNotNil(prices.get(killmail.victim.ship_type_id));

  let fittedValue = 0;
  for (const item of killmail.victim.items ?? []) {
    fittedValue += prices.get(item.item_type_id) ?? 0;
  }

  return {
    hash,
    fittedValue: fittedValue,
    totalValue: fittedValue + hullValue,
    prices: Object.fromEntries(prices),
    npc: isNpcKill(killmail),
  };
}

async function getFreshItemPrices(killmail: EsiKillmail) {
  const ids = (killmail.victim.items ?? []).map((item) => item.item_type_id);
  ids.push(killmail.victim.ship_type_id);
  return await fetchAverageMarketPrices(ids, true);
}

function isNpcKill(killmail: EsiKillmail) {
  for (const attacker of killmail.attackers) {
    if (attacker.damage_done > 0 && !isNpcAttacker(attacker)) {
      return false;
    }
  }
  return true;
}

function isNpcAttacker(attacker: Attacker) {
  return (
    (!attacker.character_id || isNpcCharacter(attacker.character_id)) &&
    (!attacker.corporation_id || isNpcCorporation(attacker.corporation_id))
  );
}

function isNpcCorporation(id: number) {
  return id >= 1_000_000 && id < 2_000_000;
}

function isNpcCharacter(id: number) {
  return id >= 3_000_000 && id < 4_000_000;
}
