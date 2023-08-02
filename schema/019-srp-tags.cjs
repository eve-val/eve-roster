/**
 * Adds `name` and `ticker` columns to `memberCorporation` table
 */

exports.up = async function (trx) {
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.string("tag").nullable().index();
  });

  await trx("srpVerdict")
    .update({ tag: "corp" })
    .whereIn("status", ["approved", "paid"]);
};

exports.down = async function (trx) {
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.dropColumn("tag");
  });
};
