exports.up = function(knex, Promise) {
  return Promise.resolve()
  .then(() => {
    return knex.schema.createTable('pendingOwnership', table => {
        table.integer('character').primary().references('character.id');
        table.integer('account').references('account.id').notNullable();
      });
    });
};

exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex.schema.dropTable('pendingOwnership');
    });
};
