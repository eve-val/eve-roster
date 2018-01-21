import { Dao } from '../dao';
import { Tnex, DEFAULT_NUM } from '../tnex';
import { killmail, Killmail, character, srpReimbursement, srpVerdict, ownership, SrpReimbursement, SrpVerdict, account, Account } from './tables';
import { SrpVerdictStatus, SrpVerdictReason } from './enums';
import { val, Comparison } from '../tnex/core';
import { Nullable } from '../util/simpleTypes';
import { ZKillmail } from '../data-source/zkillboard/ZKillmail';


export interface SrpLossFilter {
  status?: SrpVerdictStatus,
  limit?: number,
  order?: 'asc' | 'desc',
  fromKillmail?: number,
  account?: number,
  character?: number,
  killmail?: number,
  reimbursement?: number,
}

export interface SrpReimbursementFilter {
  paid: boolean | undefined,
  account: number | undefined,
  limit: number | undefined,
  order: 'asc' | 'desc',
  orderBy: 'id' | 'modified',
  startingAfter: number | undefined,
}

export default class SrpDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  async addSrpVerdictEntries(db: Tnex, rows: SrpVerdict[]) {
    await db.insertAll(srpVerdict, rows);
  }

  async listUntriagedLosses(db: Tnex) {
    return db
        .select(killmail)
        .leftJoin(srpVerdict, 'srpv_killmail', '=', 'km_id')
        .leftJoin(
            db.alias(killmail, 'related')
                .using('km_id', 'related_id')
                .using('km_data', 'related_data'),
            'related_id', '=', 'km_relatedLoss')
        .leftJoin(ownership, 'ownership_character', '=', 'km_character')
        .leftJoin(account, 'account_id', '=', 'ownership_account')
        .whereNull('srpv_killmail')
        .orderBy('km_id', 'asc')
        .columns(
            'km_data',
            'related_data',
            'account_mainCharacter',
            )
        .run();
  }

  async listSrps(db: Tnex, filter: SrpLossFilter): Promise<SrpLossRow[]> {
    let order = filter.order || 'desc';

    let query = db
        .select(killmail)
        .join(srpVerdict, 'srpv_killmail', '=' ,'km_id')
        .leftJoin(srpReimbursement, 'srpr_id', '=', 'srpv_reimbursement')
        .leftJoin(ownership, 'ownership_character', '=', 'km_character')
        .leftJoin(account, 'account_id', '=', 'ownership_account')
        .leftJoin(
            db.alias(killmail, 'related')
                .using('km_id', 'related_id')
                .using('km_data', 'related_data'),
            'related_id', '=', 'km_relatedLoss')
        .orderBy('km_id', order)
        .columns(
            'km_id',
            'km_timestamp',
            'km_data',
            'km_relatedLoss',
            'srpv_status',
            'srpv_reason',
            'srpv_payout',
            'srpr_id',
            'srpr_paid',
            'srpr_payingCharacter',
            'related_data',
            'account_mainCharacter',
            );
    if (filter.limit != undefined) {
      query = query.limit(filter.limit);
    }
    if (filter.status == 'pending') {
      query = query.where('srpv_status', '=', val(SrpVerdictStatus.PENDING))
    }
    if (filter.fromKillmail != undefined) {
      let cmp: Comparison = order == 'desc' ? '<' : '>';
      query = query.where('km_id', cmp, val(filter.fromKillmail));
    }
    if (filter.character != undefined) {
      query = query.where('km_character', '=', val(filter.character));
    } else if (filter.account != undefined) {
      query = query.where('account_id', '=', val(filter.account));
    }
    if (filter.killmail != undefined) {
      query = query.where('km_id', '=', val(filter.killmail));
    }
    if (filter.reimbursement != undefined) {
      query = query.where('srpv_reimbursement', '=', val(filter.reimbursement));
    }

    return query.run();
  }

  async setSrpVerdict(
      db: Tnex,
      killmailId: number,
      verdict: SrpVerdictStatus,
      reason: SrpVerdictReason | null,
      payout: number,
      renderingAccount: number | null,
  ) {
    // If SRP already associated with a paid reimbursement, ERROR
    // If verdict is ACCEPTED, create a reimbursement if necessary
    // Otherwise, just null out reimbursement

    return db.asyncTransaction(async db => {
      await db.acquireTransactionalLock(srpReimbursement, -1);

      const row = await db
          .select(srpVerdict)
          .join(killmail, 'km_id', '=', 'srpv_killmail')
          .leftJoin(ownership, 'ownership_character', '=', 'km_character')
          .leftJoin(account, 'account_id', '=', 'ownership_account')

          // Any preexisting reimbursement associated with this *loss*
          .leftJoin(srpReimbursement,
              'srpr_recipientCharacter', '=', 'account_mainCharacter')

          // Any preexisting reimbursement associated with this *account*
          .leftJoin(
              db.alias(srpReimbursement, 'acctReim')
                  .using('srpr_id', 'acctReim_id')
                  .using(
                      'srpr_recipientCharacter',
                      'acctReim_recipientCharacter'),
              'acctReim_recipientCharacter', '=', 'account_mainCharacter')

          // Any preexisting reimbursement associated with this *character*
          // (used if above is null)
          .leftJoin(
              db.alias(srpReimbursement, 'victimReim')
                  .using('srpr_id', 'victimReim_id')
                  .using(
                      'srpr_recipientCharacter',
                      'victimReim_recipientCharacter'),
              'victimReim_recipientCharacter', '=', 'km_character')

          .where('srpv_killmail', '=', val(killmailId))
          .columns(
              'km_character',
              'srpv_status',
              'srpr_paid',
              'acctReim_id',
              'victimReim_id',
              )
          .fetchFirst();
      if (row == null) {
        return 0;
      }
      if (row.srpr_paid) {
        throw new Error(`Cannot change the verdict on a paid SRP.`);
      }

      let reimbursement: null | number = null;

      // Create a reimbursement if necessary
      if (verdict == SrpVerdictStatus.APPROVED) {
        reimbursement = row.acctReim_id || row.victimReim_id;
        if (reimbursement == null) {
          reimbursement = await this.createReimbursement(db, row.km_character);
        }
      }

      return await db
          .update(srpVerdict, {
            srpv_status: verdict,
            srpv_reason: reason,
            srpv_payout: payout,
            srpv_reimbursement: reimbursement,
            srpv_renderingAccount: renderingAccount,
            srpv_modified: Date.now(),
          })
          .where('srpv_killmail', '=', val(killmailId))
          .run();
    });
  }

  async listReimbursements(
      db: Tnex,
      filter: SrpReimbursementFilter,
  ) {
    // Subquery: for each reimbursement, the sum of its approved payouts
    let subquery = db
        .subselect(srpReimbursement, 'combined')
        .join(srpVerdict, 'srpv_reimbursement', '=', 'srpr_id')
        .sum('srpv_payout', 'combined_payout')
        .count('srpv_killmail', 'combined_losses')
        .columnAs('srpr_id', 'combined_id')
        .groupBy('srpr_id')
        .orderBy('srpr_modified', filter.order);

    if (filter.paid != undefined) {
      subquery = subquery.where('srpr_paid', '=', val(filter.paid));
    }
    if (filter.account != undefined) {
      subquery = subquery
          .join(ownership,
              'ownership_character', '=', 'srpr_recipientCharacter')
          .where('ownership_account', '=', val(filter.account));
    }
    if (filter.limit != undefined) {
      subquery = subquery.limit(filter.limit);
    }
    if (filter.startingAfter != undefined) {
      subquery = subquery.andWhere(
          filter.orderBy == 'id' ? 'srpr_id' : 'srpr_modified',
          filter.order == 'desc' ? '<' : '>',
          val(filter.startingAfter));
    }

    return await db
        .select(srpReimbursement)
        .join(subquery, 'combined_id', '=', 'srpr_id')
        .leftJoin(character, 'character_id', '=', 'srpr_recipientCharacter')
        .leftJoin(
            db.alias(character, 'payingChar')
                .using('character_id', 'payingChar_id')
                .using('character_corporationId', 'payingChar_corporationId'),
            'payingChar_id', '=', 'srpr_payingCharacter')
        .where('combined_losses', '>', val(0))
        .columns(
            'srpr_id',
            'srpr_modified',
            'combined_payout',
            'combined_losses',
            'srpr_recipientCharacter',
            'character_corporationId',
            'srpr_payingCharacter',
            'payingChar_corporationId',
            )
        .run();
  }

  async getReimbursement(db: Tnex, id: number) {
    return db
      .select(srpReimbursement)
      .where('srpr_id', '=', val(id))
      .columns(
          'srpr_recipientCharacter',
          'srpr_modified',
          'srpr_paid',
          'srpr_payingCharacter',
          )
      .fetchFirst();
  }

  async markReimbursementAsPaid(
      db: Tnex, reimbursement: number, payingCharacter: number) {
    return await db
        .update(srpReimbursement, {
          srpr_paid: true,
          srpr_modified: Date.now(),
          srpr_payingCharacter: payingCharacter,
        })
        .where('srpr_id', '=', val(reimbursement))
        .run();
  }

  async markReimbursementAsUnpaid(db: Tnex, reimbursement: number) {
    return await db
        .update(srpReimbursement, {
          srpr_paid: false,
          srpr_modified: Date.now(),
          srpr_payingCharacter: null,
        })
        .where('srpr_id', '=', val(reimbursement))
        .run();
  }

  private async createReimbursement(db: Tnex, character: number) {
    return db
        .insert(srpReimbursement, {
          srpr_id: DEFAULT_NUM,
          srpr_recipientCharacter: character,
          srpr_modified: Date.now(),
          srpr_paid: false,
          srpr_payingCharacter: null,
        }, 'srpr_id');
  }
}

export type SrpLossRow =
    Pick<
        Killmail & SrpVerdict & Nullable<SrpReimbursement> & Nullable<Account>,
        | 'km_id'
        | 'km_timestamp'
        | 'km_relatedLoss'
        | 'km_data'
        | 'srpv_status'
        | 'srpv_reason'
        | 'srpv_payout'
        | 'srpr_id'
        | 'srpr_paid'
        | 'srpr_payingCharacter'
        | 'account_mainCharacter'
        >
    & { related_data: ZKillmail | null };
