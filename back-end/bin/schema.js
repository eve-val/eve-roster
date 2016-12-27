// schema.js
// - Creates and initializes an empty sqlite3 database
//   with the appropriate table schema.
const path = require('path');

const configLoader = require('../src/config-loader');
const CONFIG = configLoader.load();


const knex = require('knex')({
    client: 'sqlite3',
    debug: false,
    useNullAsDefault: true,
    connection: {
        filename: path.join(__dirname, '../', CONFIG.dbFileName),
    }
});

// Wrap everything in a single transaction
knex.transaction(function(trx) {
    return Promise.resolve()
    .then(function() {
        return trx.schema.createTable('privilege', table => {
            table.string('name').primary();
            table.string('category').notNullable();
            // An account can gain access to a privilege it doesn't naturally
            // have if it "owns" the resource in question. This column
            // specifies its privilege level in that case.
            table.integer('ownerLevel').notNullable();
            table.text('description').notNullable();
        });
    })
    .then(function() {
        return trx('privilege').insert([
            { name: 'roster', category: 'roster', ownerLevel: 0,
                description: 'Access to the list of members and their alts.' },
            { name: 'extendedRoster', category: 'roster', ownerLevel: 0,
                description: 'Can see all roster info.' },
            { name: 'basicMember', category: 'character', ownerLevel: 1,
                description: 'Can access member pages.'},
            { name: 'memberHousing', category: 'character', ownerLevel: 1,
                description: 'Can see other members\' housing.'},
            { name: 'memberTimezone', category: 'character', ownerLevel: 2,
                description: 'Can see other members\' active timezone.'},
            { name: 'memberSkills', category: 'character', ownerLevel: 1,
                description: 'View members\' skills.' },
            { name: 'memberSkillQueue', category: 'character', ownerLevel: 1,
                description: 'View members\' skill queue.' },
        ]);
    })
    .then(function() {
        return trx.schema.createTable('role', table => {
            table.string('name').primary().notNullable();
        });
    })
    .then(function() {
        return trx('role').insert([
            // Special role; automatically assigned to any account with a
            // mainCharacter in the alliance.
            { name: '__member'},

            { name: 'admin'},
            { name: 'provisional_member'},
            { name: 'full_member'},
        ]);
    })
    .then(function() {
        return trx.schema.createTable('rolePriv', table => {
            table.string('role')
                .index().references('role.name').notNullable();
            table.string('privilege')
                .index().references('privilege.name').notNullable();
            // 0 = none, 1 = read, 2 = write
            table.integer('level').notNullable();

            table.unique(['role', 'privilege']);
        });
    })
    .then(function() {
        return trx('rolePriv').insert([
            { role: 'admin', privilege: 'roster', level: 2 },
            { role: 'admin', privilege: 'extendedRoster', level: 2 },
            { role: 'admin', privilege: 'basicMember', level: 2 },
            { role: 'admin', privilege: 'memberHousing', level: 2 },
            { role: 'admin', privilege: 'memberTimezone', level: 2 },
            { role: 'admin', privilege: 'memberSkills', level: 2 },
            { role: 'admin', privilege: 'memberSkillQueue', level: 0 },

            { role: 'full_member', privilege: 'roster', level: 1 },
            { role: 'full_member', privilege: 'basicMember', level: 1 },
            { role: 'full_member', privilege: 'memberTimezone', level: 1 },
            { role: 'full_member', privilege: 'memberHousing', level: 1 },

            { role: 'provisional_member', privilege: 'roster', level: 1 },
        ]);
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
            table.integer('mainCharacter')
                .references('character.id').nullable();

            table.enu('activeTimezone',
                ['US East', 'US Central', 'US West', 'EU', 'AU']).nullable();
            table.string('homeCitadel').nullable().references('citadel.name');
        });
    })
    .then(function() {
        return trx.schema.createTable('accountRole', (table) => {
            table.integer('account')
                .references('account.id').index().notNullable();
            table.string('role').references('role.name').notNullable();
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
