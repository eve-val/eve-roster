exports.up = async function (trx) {
  await trx.schema.renameTable("killboard", "characterCombatStats");
};

exports.down = async function (trx) {
  await trx.schema.renameTable("characterCombatStats", "killboard");
};
