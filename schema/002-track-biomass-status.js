exports.up = function(trx) {
  return Promise.resolve()
  .then(() => {
    return trx.schema.table('character', function(table) {
      table.boolean('deleted');
    })
  })
  .then(() => {
    return trx('character')
        .update({
          deleted: false,
        });
  })
  .then(() => {
    trx.schema.alterTable('character', table => {
      table.boolean('deleted').notNullable().alter();
    });
  })
};

exports.down = function(trx) {
  return Promise.resolve()
  .then(() => {
    return trx.schema.table('character', function(table) {
      table.dropColumn('deleted')
    })
  })
};
