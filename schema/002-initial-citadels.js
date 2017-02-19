// Inserts initial citadel line up based on in-game anchored structures
exports.up = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      // Current citadels in J+
      return knex('citadel').insert([
          {name: 'A Little Krabby', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Elation', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Enthusiasm', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Exhilaration', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Exuberance', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Flotsam', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Forward Ruderino Detection Array', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'King\'s Landing', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Liverpool Bay', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Pons', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Roanoke', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Skykrab', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'The Banana Stand', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'The Ga733bo', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Witzend', type: 'Astrahus', allianceAccess: true, allianceOwned: true},
          {name: 'Absent\'s Bed and Breakfast', type: 'Astrahus', allianceAccess: true, allianceOwned: false},
          {name: 'Astrohouse', type: 'Astrahus', allianceAccess: false, allianceOwned: false},
          {name: 'Castle Black', type: 'Astrahus', allianceAccess: false, allianceOwned: false},
          {name: 'Dumb Little Paws', type: 'Astrahus', allianceAccess: false, allianceOwned: false},
          {name: 'Hammerheim', type: 'Astrahus', allianceAccess: false, allianceOwned: false},
          {name: 'Palais du Mireille', type: 'Astrahus', allianceAccess: true, allianceOwned: false},
          {name: 'The Black Lodge', type: 'Astrahus', allianceAccess: true, allianceOwned: false},
          {name: 'Wafflehus', type: 'Astrahus', allianceAccess: true, allianceOwned: false},
          {name: 'Dern\'s House of Pancakes', type: 'Fortizar', allianceAccess: true, allianceOwned: true}]);
    })
};

// Deletes all values in the citadel table, which is the correct behavior
// assuming that no values were inserted outside of the migrations system.
exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('citadel').del();
    })
};