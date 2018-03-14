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

  async createSrpEntries(db: Tnex, killmailIds: number[]) {
    await db.insertAll(srpVerdict, killmailIds.map(kmId => {
      return {
        srpv_killmail: kmId,
        srpv_status: SrpVerdictStatus.PENDING,
        srpv_reason: null,
        srpv_payout: 0,
        srpv_reimbursement: null,
        srpv_modified: Date.now(),
        srpv_renderingAccount: null,
      };
    }));
  }

  async listKillmailsMissingSrpEntries(db: Tnex) {
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
            'km_id',
            'km_timestamp',
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

      const lossRow = await db
          .select(srpVerdict)
          .join(killmail, 'km_id', '=', 'srpv_killmail')
          .where('srpv_killmail', '=', val(killmailId))
          .leftJoin(srpReimbursement,
              'srpr_id', '=', 'srpv_reimbursement')
          .columns(
              'srpr_id',
              'srpr_paid',
              'km_character',
              )
          .fetchFirst();

      if (lossRow == null) {
        return 0;
      }
      if (lossRow.srpr_paid) {
        throw new Error(`Cannot change the verdict on a paid SRP.`);
      }

      // Create an associated reimbursement if necessary
      let rid: number | null = null;
      if (verdict == SrpVerdictStatus.APPROVED) {
        if (lossRow.km_character == null) {
          throw new Error(`Cannot approve SRP for losses with no recipient.`);
        }
        rid = lossRow.srpr_id;
        if (rid == null) {
          rid = await this.findExistingReimbursement(db, lossRow.km_character);
        }
        if (rid == null) {
          rid = await this.createReimbursement(db, lossRow.km_character);
        }
      }

      return await db
          .update(srpVerdict, {
            srpv_status: verdict,
            srpv_reason: reason,
            srpv_payout: payout,
            srpv_reimbursement: rid,
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

  /**
   * Given a time that the system's jurisdiction starts, sets all older,
   * PENDING losses to INELIGIBLE - OUTSIDE_JURISDICTION.
   *
   * Also undoes this effect for any newer losses.
   */
  async adjustJurisdictionStatuses(db: Tnex, jurisdictionStarts: number) {
    await db
        .update(srpVerdict, {
          srpv_status: SrpVerdictStatus.INELIGIBLE,
          srpv_reason: SrpVerdictReason.OUTSIDE_JURISDICTION,
        })
        .from(killmail)
        .where('km_id', '=', 'srpv_killmail')
        .where('srpv_status', '=', val(SrpVerdictStatus.PENDING))
        .where('km_timestamp', '<', val(jurisdictionStarts))
        .run();

    await db
        .update(srpVerdict, {
          srpv_status: SrpVerdictStatus.PENDING,
          srpv_reason: null,
        })
        .from(killmail)
        .where('km_id', '=', 'srpv_killmail')
        .where('srpv_status', '=', val(SrpVerdictStatus.INELIGIBLE))
        .where('srpv_reason', '=', val(SrpVerdictReason.OUTSIDE_JURISDICTION))
        .where('km_timestamp', '>=', val(jurisdictionStarts))
        .run();
  }

  /** Returns the total payout of all approved but unpaid losses. */
  async getApprovedLiability(db: Tnex) {
    return db
        .select(srpReimbursement)
        .join(srpVerdict, 'srpv_reimbursement', '=', 'srpr_id')
        .where('srpr_paid', '=', val(false))
        .sum('srpv_payout', 'liability')
        .fetchFirst();
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

  private async findExistingReimbursement(db: Tnex, characterId: number) {
    // If the character is owned by an account, check to see if that account
    // has an open reimbursement.
    const accountReim = await db
          .select(character)
          .leftJoin(ownership, 'ownership_character', '=', 'character_id')
          .leftJoin(account, 'account_id', '=', 'ownership_account')
          .leftJoin(srpReimbursement,
              'srpr_recipientCharacter', '=', 'account_mainCharacter')
          .where('character_id', '=', val(characterId))
          .where('srpr_paid', '=', val(false))
          .columns(
              'srpr_id'
              )
          .fetchFirst();

      if (accountReim != null && accountReim.srpr_id != null) {
        return accountReim.srpr_id;
      }

      // Otherwise, check to see if the character itself has an open
      // reimbursement.
      const characterReim = await db
          .select(srpReimbursement)
          .where('srpr_recipientCharacter', '=', val(characterId))
          .where('srpr_paid', '=', val(false))
          .columns(
              'srpr_id'
              )
          .fetchFirst();

      return characterReim && characterReim.srpr_id;
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
