
/**
 * Adds tables related to tracking SRP.
 */
exports.up = async function(trx) {
  await trx.schema.createTable('srpReimbursement', table => {
    table.increments('id');

    table.integer('recipientCharacter').notNullable();
    table.bigInteger('modified').notNullable();
    table.boolean('paid').notNullable();
    table.integer('payingCharacter').references('character.id').nullable();
  });

  await trx.schema.createTable('srpVerdict', table => {
    table.integer('killmail').primary().references('killmail.id').notNullable();
    table.string('status').notNullable();
    table.string('reason').nullable();
    table.integer('payout').notNullable();
    table.integer('reimbursement').references('srpReimbursement.id').nullable();
    table.bigInteger('modified').notNullable();
    table.integer('renderingAccount').references('account.id').nullable();
  });

  await trx('privilege')
      .insert([
        {
          name: 'srp',
          category: 'operations',
          ownerLevel: 0,
          requiresMembership: true,
          description: 'Read and write to the SRP log.',
        },
      ]);

  await trx('groupPriv')
      .insert([
        { group: '__member', privilege: 'srp', level: 1 },
        { group: 'admin', privilege: 'srp', level: 2 },
      ]);

  await trx('privilege')
      .update({ category: 'operations' })
      .where('name', '=', 'citadels' );
}

exports.down = async function(trx) {
  await trx('privilege')
      .update({ category: 'admin' })
      .where('name', '=', 'citadels');

  await trx('groupPriv')
      .del()
      .where('privilege', '=', 'srp');

  await trx('privilege')
      .del()
      .where('name', '=', 'srp');

  await trx.schema.dropTable('srpVerdict');
  await trx.schema.dropTable('srpReimbursement');
}
