
/**
 * Converts character.titles to a jsonb column.
 */

exports.up = async function(trx) {
  await trx.schema.raw(
      `ALTER TABLE "character" ALTER COLUMN "titles" TYPE jsonb USING titles::jsonb;`);
}

exports.down = async function(trx) {
  await trx.schema.raw(
      `ALTER TABLE "character" ALTER COLUMN "titles" TYPE character varying(255);`);
}
