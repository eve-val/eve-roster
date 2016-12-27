// schema.js
// - Creates and initializes an empty sqlite3 database
//   with the appropriate table schema.

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();

const knex = require('knex')({
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
    return trx.schema.createTable('role', (table) => {
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
    })
    .then(function() {
        // Insert statically defined roles, since this is basically an enum
        return trx.insert([
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
            .into('role');
    })
    .then(function() {
        // Citadels in J+
        // FIXME is it worth including the EVE ID of the citadel?
        return trx.schema.createTable('citadel', (table) => {
            table.string('name').primary();
            table.string('type').notNullable();
            table.boolean('allianceAccess').notNullable();
            table.boolean('allianceOwned').notNullable();
        });
    })
    .then(function() {
        // Current citadels in J+
        return trx.insert([
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
                {name: 'Dern\'s House of Pancakes', type: 'Fortizar', allianceAccess: true, allianceOwned: true}])
        .into('citadel');
    })
    .then(function() {
        return trx.schema.createTable('account', (table) => {
            table.increments('id');
            // FIXME comma separated list? break it into a many-to-many table
            // between member and role that tracks each?
            table.string('roles').notNullable();
            table.integer('mainCharacter')
                .references('character.id').nullable();

            table.enu('activeTimezone',
                ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
            table.string('homeCitadel').nullable().references('citadel.name');
        });
    })
    .then(function() {
        // Members - Data on all members and ex-members. Ex-members are
        // remembered so that alts that have not left SOUND can still be
        // represented (and warned about).
        return trx.schema.createTable('character', (table) => {
            table.integer('id').primary();
            table.string('name').notNullable();
            table.integer('corporationId').index().notNullable();

            // Just a JSON array. Maybe this should be a table?
            table.string('titles').nullable();

            // In Unix time
            table.integer('startDate');
            table.integer('logonDate');
            table.integer('logoffDate');

            // From zKillboard
            table.integer('killsInLastMonth');
            table.integer('killValueInLastMonth');
            table.integer('lossesInLastMonth');
            table.integer('lossValueInLastMonth');

            // From Siggy
            table.integer('siggyScore');
        });
    })
    .then(function() {
        return trx.schema.createTable('ownership', (table) => {
            table.integer('character').primary().references('character.id');
            table.integer('account').references('account.id').notNullable();
        });
    })
    .then(function() {
        return trx.schema.createTable('accessToken', (table) => {
            table.integer('character')
                    .primary().references('character.id').notNullable();
            table.string('refreshToken').notNullable();
            table.string('accessToken').notNullable();
            table.integer('accessTokenExpires').notNullable();
            table.boolean('needsUpdate').notNullable();
        });
    })
    .then(function() {
        return trx.schema.createTable('skillsheet', (table) => {
            table.integer('character')
                    .references('character.id').index().notNullable();
            table.integer('skill').notNullable();
            table.integer('level').notNullable();
            table.integer('skillpoints').notNullable();

            table.unique(['character', 'skill']);
        });
    });
}).then(function() {
    console.log('Schema transaction completed successfully.');
    process.exit(0);
}).catch(function(e) {
    console.log('Schema transaction failed.');
    console.error(e);
    process.exit(1);
});
