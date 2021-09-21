/**
 * Adds a table to track killmails. This is essentially just a store for
 * Zkillboard JSON blobs although it has some extra data pulled out. Notably
 * it tracks associations between capsule and ship losses (if they happened
 * on the same character within a time window).
 */
exports.up = async function (trx) {
  await trx.schema.createTable("killmail", (table) => {
    table.integer("id").primary();

    table.bigInteger("timestamp").index().notNullable();
    table.string("type").notNullable();
    table.string("hullCategory").notNullable();
    table.integer("relatedLoss").nullable();
    table.integer("character").notNullable();
    table.integer("sourceCorporation").notNullable();
    table.jsonb("data").notNullable();
  });
};

exports.down = async function (trx) {
  await trx.schema.dropTable("killmail");
};
