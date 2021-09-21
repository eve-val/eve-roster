/**
 * Makes the value field for text long enough.
 */
exports.up = async function (trx) {
  await trx.schema.alterTable("characterNotification", (table) => {
    table.string("text", 2500).notNullable().alter();
  });
};

exports.down = async function (trx) {
  await trx.schema.alterTable("characterNotification", (table) => {
    table.string("text", 1000).notNullable().alter();
  });
};
