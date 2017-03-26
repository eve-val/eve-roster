/**
 * Modifies the schema of a SQLite table. Due to the restrictions of SQLite,
 * this involves creating a new table and copying the contents of the old table
 * into the new one. See https://www.sqlite.org/lang_altertable.html.
 * 
 * @param trx The knex transaction object to use. This should be a transaction
 *    and not a bare knex instance.
 * @param tableName The name of the table to modify.
 * @param tableBuilder A function that takes a `table` parameter, same as the
 *    one you'd get from calling knex.schema.createTable(). It should create
 *    the new form of the table.
 * @param sourceData The data to copy from the source table. This is usually a
 *    list of column names but can also be constant values.
 * @param targetColumns The names of the new columns to copy the sourceData
 *    into. This should be the same length as `sourceData`.
 */
module.exports = function alterTable(
    trx,
    tableName, 
    tableBuilder,
    sourceData,
    targetColumns) {
  return Promise.resolve()
  .then(() => {
    return trx.raw(`CREATE TEMPORARY TABLE tmp AS SELECT * FROM ${tableName}`);
  })
  .then(() => {
    return trx.schema.dropTable(tableName);
  })
  .then(() => {
    return trx.schema.createTable(tableName, tableBuilder);
  })
  .then(() => {
    return trx.raw(`
        INSERT INTO ${tableName}
            (${ targetColumns.join(', ') })
        SELECT ${ sourceData.join(', ') }
        FROM tmp`);
  })
  .then(() => {
    return trx.schema.dropTable('tmp');
  });
}
