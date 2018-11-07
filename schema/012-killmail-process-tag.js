
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
  await trx.schema.alterTable('killmail', table => {
    table.string('type').nullable();
    table.integer('sourceCorporation').nullable();
  });

  await trx.raw(
      `UPDATE "killmail" as km
        SET
          "type" =
            (CASE
              WHEN "mc"."corporationId" IS NOT NULL THEN 'loss'
              ELSE 'kill'
              END),
          "sourceCorporation" = -1
        FROM "killmail" as "km2"
          LEFT JOIN "memberCorporation" as "mc"
            ON "mc"."corporationId" = "km2"."victimCorp"
        WHERE "km2"."id" = "km"."id"`);

  await trx.schema.alterTable('killmail', table => {
    table.dropColumn('victimCorp');
    table.dropColumn('processed');

    table.string('type').alter().notNullable();
    table.integer('sourceCorporation').alter().notNullable();
  });

  await trx.schema.alterTable('srpVerdict', table => {
    table.dropIndex('status');
  });
}
