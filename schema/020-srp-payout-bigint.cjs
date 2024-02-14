/**
 * Updates the `srpVerdict.payout` column to be a bigint instead of just an int,
 * because it's quite possible for capital SRPs to exceed 2.1b.
 */

exports.up = async function (trx) {
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.bigInteger("payout").notNullable().alter();
  });
};

exports.down = async function (trx) {
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.integer("payout").notNullable().alter();
  });
};
