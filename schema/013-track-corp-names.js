
/**
 * Adds `name` and `ticker` columns to `memberCorporation` table
 */

exports.up = async function(trx) {
  await trx.schema.alterTable('memberCorporation', table => {
    table.string('name').nullable();
    table.string('ticker').nullable();
  });

  await trx('memberCorporation').update({
    name: '????',
    ticker: '??'
  });

  await trx.schema.alterTable('memberCorporation', table => {
    table.string('name').alter().notNullable();
    table.string('ticker').alter().notNullable();
  });
}

exports.down = async function(trx) {
  await trx.schema.alterTable('memberCorporation', table => {
    table.dropColumn('name');
    table.dropColumn('ticker');
  });
}
