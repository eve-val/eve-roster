exports.up = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('citadel').insert([
          {name: 'BONESAW', type: 'Astrahus', allianceAccess: true, allianceOwned: true}]);
    })
};

exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('citadel')
          .del()
          .where('name', '=', 'BONESAW');
    })
};
