
/**
 * Adds a "processed" column to killmails, indicating that they've been fully-
 * ingested by the system. Necessary due to changes in the killmail ingestion
 * pipeline.
 *
 * Also adds indexes for some commonly-queried columns.
 */

exports.up = async function(trx) {
  await trx.schema.alterTable('killmail', table => {
    table.integer('victimCorp').nullable().index();
    table.boolean('processed').nullable();
    table.dropColumn('type');
    table.dropColumn('sourceCorporation');
  });

  await trx.raw(`UPDATE "killmail"`
      + ` SET "victimCorp" = ("data"->'victim'->>'corporation_id')::int`);

  await trx('killmail').update({ processed: true });
  await trx.schema.alterTable('killmail', table => {
    table.boolean('processed').alter().notNullable().index();
  });

  await trx.schema.alterTable('srpVerdict', table => {
    table.string('status').alter().notNullable().index();
  });
};

exports.down = async function(trx) {
  // throw new Error(`Can't bring the dead back to life.`)

  await trx.schema.alterTable('killmail', table => {
    table.dropIndex('sourceCorporation');
    table.dropColumn('victimCorp');
    table.dropColumn('processed');

    // Can't bring back the deleted columns.
  });

  await trx.schema.alterTable('srpVerdict', table => {
    table.dropIndex('status');
  });
}
