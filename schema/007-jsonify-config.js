/**
 * Converts the "config" table to use the jsonb type.
 * Marks killmail.character as nullable (structure and unmanned losses).
 * Adds two config entries for SRP tracking.
 */

exports.up = async function (trx) {
  await trx.schema.raw(
    `ALTER TABLE "config" ALTER COLUMN "value" TYPE jsonb USING value::jsonb;`
  );

  await trx.schema.alterTable("killmail", (table) => {
    table.integer("character").alter().nullable();
  });

  await trx("config").insert([
    {
      key: "srpJurisdiction",
      value: null,
      description: "The start (and possibly end) date from which to track SRP",
    },
    {
      key: "killmailSyncRanges",
      value: null,
      description:
        "(internal) Time ranges for which killmails have been synced",
    },
  ]);
};

exports.down = async function (trx) {
  await trx("config").del().where("key", "=", "srpJurisdiction");

  await trx("config").del().where("key", "=", "killmailSyncRanges");

  await trx.schema.alterTable("killmail", (table) => {
    table.integer("character").alter().notNullable();
  });

  await trx.schema.raw(`ALTER TABLE "config" ALTER COLUMN "value" TYPE text;`);
};
