const Promise = require('bluebird');
const migrate = require('./util/migrate');


exports.up = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.createTable('characterSkillQueue', table => {
      table.integer('character').references('character.id').index();
      table.integer('queuePosition').notNullable().index();
      table.integer('skill').notNullable();
      table.integer('targetLevel').notNullable();
      table.bigInteger('startTime').nullable();
      table.bigInteger('endTime').nullable();
      table.integer('levelStartSp').notNullable();
      table.integer('levelEndSp').notNullable();
      table.integer('trainingStartSp').notNullable();

      table.unique(['character', 'queuePosition']);
      table.unique(['character', 'skill', 'targetLevel']);
    });
  });
});

exports.down = migrate(trx => {
  return Promise.resolve()
  .then(() => {
    return trx.schema.dropTable('characterSkillQueue');
  })
});
