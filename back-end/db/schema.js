// schema.js
// - Creates and initializes an empty sqlite3 database
//   with the appropriate table schema.

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();

var knex = require('knex')({
    client: 'sqlite3',
    debug: false,
    useNullAsDefault: true,
    connection: {
        filename: CONFIG.dbFileName
    }
});

// Wrap everything in a single transaction
knex.transaction(function(trx) {
    // Roles - Specifies permissions for viewing/modifying roster associated
    // with in-game roles (used as access management). If a character has 
    // multiple roles, the effective permissions are the OR of the corresponding 
    // booleans. These roles correspond to in-game roles, with the exception of 
    // NOT_A_MEMBER, and so does not include alt-status of the character.
    knex.schema.transacting(trx).createTable('role', function(table) {
        table.string('name').primary();
        // True if player can see the list of players in SA.FE
        table.boolean('viewBasicRoster').notNullable();
        // True if player can see the alt status/roles of characters in SA.FE
        table.boolean('viewFullRoster').notNullable();
        // True if player can see the citadel they've been assigned too
        table.boolean('viewAssignedCitadel').notNullable();
        // True if player can see members of their assigned citadel
        table.boolean('viewAssignedCitadelMembers').notNullable();
        // True if player can see all citadel assignments
        table.boolean('viewCitadelAssignments').notNullable();
        // True if player can modify citadel assignments
        table.boolean('editCitadelAssignments').notNullable();
        // True if player can see inconsistency warnings in roster state
        table.boolean('viewRosterWarnings').notNullable();
    }).then(function() {
        // Insert statically defined roles, since this is basically an enum
        return knex.insert([
                {name: 'NOT_A_MEMBER', 
                    viewBasicRoster: false, 
                    viewFullRoster: false, 
                    viewAssignedCitadel: false,
                    viewAssignedCitadelMembers: false, 
                    viewCitadelAssignments: false, 
                    editCitadelAssignments: false, 
                    viewRosterWarnings: false},
                {name: 'Official Sound FC',
                    viewBasicRoster: true, 
                    viewFullRoster: true, 
                    viewAssignedCitadel: true,
                    viewAssignedCitadelMembers: true, 
                    viewCitadelAssignments: true,
                    editCitadelAssignments: false, 
                    viewRosterWarnings: false},
                {name: 'Junior Sound FC',
                    viewBasicRoster: true, 
                    viewFullRoster: false, 
                    viewAssignedCitadel: true,
                    viewAssignedCitadelMembers: false, 
                    viewCitadelAssignments: false, 
                    editCitadelAssignments: false, 
                    viewRosterWarnings: false},
                {name: 'Staff',
                    viewBasicRoster: true, 
                    viewFullRoster: true, 
                    viewAssignedCitadel: true,
                    viewAssignedCitadelMembers: true, 
                    viewCitadelAssignments: true, 
                    editCitadelAssignments: true, 
                    viewRosterWarnings: false},
                {name: 'Director',
                    viewBasicRoster: true, 
                    viewFullRoster: true, 
                    viewAssignedCitadel: true,
                    viewAssignedCitadelMembers: true, 
                    viewCitadelAssignments: true, 
                    editCitadelAssignments: true, 
                    viewRosterWarnings: true}])
            .into('role')
            .transacting(trx)
    }).then(function() {
        // Citadels in J+
        // FIXME is it worth including the EVE ID of the citadel?
        return knex.schema.transacting(trx).createTable('citadel', function(table) {
            table.string('name').primary();
        });
    }).then(function() {
        // Current citadels in J+
        return knex.insert([
                {name: 'A Little Krabby'},
                {name: 'Elation'},
                {name: 'Enthusiasm'},
                {name: 'Exhilaration'},
                {name: 'Exuberance'},
                {name: 'Flotsam'},
                {name: 'Forward Ruderino Detection Array'},
                {name: 'King\'s Landing'},
                {name: 'Liverpool Bay'},
                {name: 'Pons'},
                {name: 'Roanoke'},
                {name: 'Skykrab'},
                {name: 'The Banana Stand'},
                {name: 'The Ga733bo'},
                {name: 'Witzend'},
                {name: 'Absent\'s Bed and Breakfast'},
                {name: 'Astrohouse'},
                {name: 'Castle Black'},
                {name: 'Dumb Little Paws'},
                {name: 'Hammerheim'},
                {name: 'Palais du Mireille'},
                {name: 'The Black Lodge'},
                {name: 'Wafflehus'}])
        .into('citadel').transacting(trx)
    }).then(function() {
        // Members - Data on all members and ex-members. Ex-members have their
        // role set to NOT_A_MEMBER, but are otherwise remembered so that 
        // alts that have not left SOUND can still be represented (and warned 
        // about).
        return knex.schema.transacting(trx).createTable('member', function(table) {
            // From XML API
            table.integer('characterID').primary();
            table.string('name').unique();
            table.integer('corporationID').notNullable();
            table.date('startDate').notNullable();
            table.date('logonDate').notNullable();
            table.date('logoffDate').notNullable();
            // FIXME comma separated list? break it into a many-to-many table
            // between member and role that tracks each?
            table.string('roles').notNullable();

            // From zKillboard
            table.integer('killsInLastMonth');
            table.integer('killValueInLastMonth');
            table.integer('lossesInLastMonth');
            table.integer('lossValueInLastMonth');

            // From Siggy
            table.integer('siggyScore');

            // Custom
            table.integer('mainID').nullable().references('characterID');
            table.enu('activeTimezone', ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
            table.string('homeCitadel').nullable().references('name').inTable('citadel');
        });
    }).then(trx.commit).catch(trx.rollback);

}).then(function() {
    console.log('Schema transaction completed successfully.');
    process.exit(0);
}).catch(function(e) {
    console.log('Schema transaction failed.');
    console.error(e);
    process.exit(1);
});
