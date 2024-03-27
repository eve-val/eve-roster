/**
 * Adds ON CASCADE DELETE to the killmail_id part of killmailBattle
 */

exports.up = async function (trx) {
  await trx.schema.alterTable("killmailBattle", (table) => {
    table.dropForeign("killmail");
  });
  await trx.schema.alterTable("killmailBattle", (table) => {
    table.foreign("killmail").references("killmail.id").onDelete("CASCADE");
  });

  await trx.schema.alterTable("srpVerdict", (table) => {
    table.dropForeign("killmail");
    table.dropForeign("reimbursement");
  });
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.foreign("killmail").references("killmail.id").onDelete("CASCADE");
    table
      .foreign("reimbursement")
      .references("srpReimbursement.id")
      .onDelete("SET NULL");
  });
};

exports.down = async function (trx) {
  await trx.schema.alterTable("killmailBattle", (table) => {
    table.dropForeign("killmail");
  });
  await trx.schema.alterTable("killmailBattle", (table) => {
    table.foreign("killmail").references("killmail.id");
  });

  await trx.schema.alterTable("srpVerdict", (table) => {
    table.dropForeign("killmail");
    table.dropForeign("reimbursement");
  });
  await trx.schema.alterTable("srpVerdict", (table) => {
    table.foreign("killmail").references("killmail.id");
    table.foreign("reimbursement").references("srpReimbursement.id");
  });
};
