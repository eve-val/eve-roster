// Inserts privilege and role relations for SOUND's current titles/roles in game
exports.up = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('privilege').insert([
        { name: 'roster', category: 'roster', ownerLevel: 0,
          description: 'Access to the list of members and their alts.' },

        { name: 'memberAlts', category: 'member', ownerLevel: 2,
          description: 'What alts a member has.' },
        { name: 'memberExternalAlts', category: 'member', ownerLevel: 2,
          description: '[NOT IMPLEMENTED] What unaffiliated alts a member has. Requires "memberAlts".' },
        { name: 'memberHousing', category: 'member', ownerLevel: 1,
          description: 'What citadel a member lives in.'},
        { name: 'memberTimezone', category: 'member', ownerLevel: 2,
          description: 'A member\'s active timezone.'},

        { name: 'characterActivityStats', category: 'character', ownerLevel: 1,
          description: 'A character\'s logon/logoff/kills/losses/scanning stats.' },
        { name: 'characterSkills', category: 'character', ownerLevel: 1,
          description: 'A character\'s skills.' },
        { name: 'characterSkillQueue', category: 'character', ownerLevel: 1,
          description: 'A character\'s skill queue.' },
      ]);
    })
    .then(function() {
      return knex('role').insert([
        // Special role; automatically assigned to any account with a
        // mainCharacter in the alliance.
        { name: '__member'},

        { name: 'admin'},
        { name: 'provisional_member'},
        { name: 'full_member'},
      ]);
    })
    .then(function() {
      return knex('rolePriv').insert([
        { role: 'admin', privilege: 'roster', level: 2 },
        { role: 'admin', privilege: 'memberAlts', level: 2 },
        { role: 'admin', privilege: 'memberExternalAlts', level: 2 },
        { role: 'admin', privilege: 'memberHousing', level: 2 },
        { role: 'admin', privilege: 'memberTimezone', level: 2 },
        { role: 'admin', privilege: 'characterActivityStats', level: 2 },
        { role: 'admin', privilege: 'characterSkills', level: 2 },
        { role: 'admin', privilege: 'characterSkillQueue', level: 0 },

        { role: 'full_member', privilege: 'roster', level: 1 },
        { role: 'full_member', privilege: 'memberTimezone', level: 1 },
        { role: 'full_member', privilege: 'memberHousing', level: 1 },
        { role: 'full_member', privilege: 'memberAlts', level: 1 },

        { role: 'provisional_member', privilege: 'roster', level: 1 },
      ]);
    })
};

// Deletes all values in the privilege, role, and rolePriv tables, which is the correct behavior
// assuming that no values were inserted outside of the migrations system.
exports.down = function(knex, Promise) {
  return Promise.resolve()
    .then(function() {
      return knex('rolePriv').del();
    })
    .then(function() {
      return knex('role').del();
    })
    .then(function() {
      return knex('privilege').del();
    })
};