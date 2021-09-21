/**
 * Drops API keys from memberCorporation table.
 */

exports.up = async function (trx) {
  await trx.schema.alterTable("memberCorporation", (table) => {
    table.dropColumn("apiKeyId");
    table.dropColumn("apiVerificationCode");
  });
};

exports.down = async function (trx) {
  await trx.schema.alterTable("memberCorporation", (table) => {
    table.integer("apiKeyId").nullable();
    table.string("apiVerificationCode").nullable();
  });

  await trx("memberCorporation").update({
    apiKeyId: 0,
    apiVerificationCode: "",
  });

  await trx.schema.alterTable("memberCorporation", (table) => {
    table.integer("apiKeyId").alter().notNullable();
    table.string("apiVerificationCode").alter().notNullable();
  });
};
