/**
 * Creates tables to track killmails clustered into battles.
 */

exports.up = async function (trx) {
  await trx.schema.createTable("battle", (table) => {
    table.increments("id");
    table.bigInteger("start").notNullable().index();
    table.bigInteger("end").notNullable().index();
    table.jsonb("data").notNullable();
  });

  await trx.schema.createTable("killmailBattle", (table) => {
    table.integer("killmail").primary().references("killmail.id");
    table
      .integer("battle")
      .references("battle.id")
      .onDelete("CASCADE")
      .notNullable()
      .index();
  });
};

exports.down = async function (trx) {
  await trx.schema.dropTable("killmailBattle");
  await trx.schema.dropTable("battle");
};
