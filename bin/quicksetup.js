/**
 * Script that automates most of the client-side server setup flow. Run with
 * no arguments for usage instructions.
 * 
 * Do not use this in production.
 */
const fs = require('fs');
const path = require('path');

const rjson = require('relaxed-json');

const asyncUtil = require('../src/util/asyncUtil');
const dao = require('../src/dao');
const accountRoles = require('../src/data-source/accountRoles');
const updateDbSchema = require('./updatedb');


function main() {
  let action = process.argv[2];

  switch (action) {
    case 'example':
      console.log(EXAMPLE_INPUT);
      break;
    case 'import':
      let path = process.argv[3];
      path || die(`You must specify a filename to import`);
      importConfig(path);
      break;
    default:
      console.log(HELP);
  }
}

function importConfig(filepath) {
  let config;

  return Promise.resolve()
  .then(() => {
    let absPath = path.resolve(filepath);
    config = JSON.parse(rjson.transform(fs.readFileSync(absPath, 'utf8')));

    verifyConfig(config);
  })
  .then(updateDbSchema)
  .then(checkForAtLeastOneAccount)
  .then(() => {
    console.log('Importing config...');
    return storeConfig(config);
  })
  .then(() => {
    console.log('Config import complete.');
    process.exit();    
  })
  .catch(e => {
    console.error('ERROR!');
    console.error(e);
    die();
  });
}

function verifyConfig(config) {
  if (typeof config != 'object') {
    die('Root element must be an object');
  }

  requireField(config, 'corporations', Array, false);
  verifyCorporationsArray(config.corporations);

  requireField(config, 'siggy', 'object', true);
  if (config.siggy) {
    requireField(config.siggy, 'username', 'string');
    requireField(config.siggy, 'password', 'string');
  }
}

function verifyCorporationsArray(config) {
  let hasAtLeastOnePrimary = false;
  for (let corp of config) {
    verifyCorporation(corp);
    hasAtLeastOnePrimary |= !!corp.primary;
  }
  if (!hasAtLeastOnePrimary) {
    die('At least one corporation must be marked `primary: true`.');
  }
}

function verifyCorporation(config) {
  requireField(config, 'id', 'number', false);
  requireField(config, 'keyId', 'number', false);
  requireField(config, 'vCode', 'string', false);
  requireField(config, 'id', Array, true);
  requireField(config, 'primary', 'boolean', true);

  for (let v in config.titles) {
    if (typeof config.titles[v] != 'string') {
      die(`Invalid role for title "${v}". must be a string.`);
    }
  }
}

function requireField(obj, varname, type, optional=false) {
  let val = obj[varname];
  if (val == undefined && optional) {
    return;
  }
  if (val == undefined) {
    die(`Missing required field "${varname}" in object `
        + JSON.stringify(obj, null, 2));
  }
  if (typeof type == 'object') {
    if (!(val instanceof type)) {
      die(`Wrong type on field "${varname}". Required: ${type.name}. In object `
          + JSON.stringify(obj, null, 2));
    }
  }
  if (typeof type == 'string') {
    if (typeof val != type) {
      die(`Wrong type on field "${varname}". Required: ${type}. In object `
          + JSON.stringify(obj, null, 2));
    }
  }
}

function checkForAtLeastOneAccount() {
  console.log('Checking for account...');
  return dao.builder('account').select().limit(1)
  .then(rows => {
    if (rows.length == 0) {
      die('You must log in with at least one character first.');
    }
  });
}

function storeConfig(config) {
  return dao.transaction(trx => {
    return Promise.resolve()
    .then(() => dropExistingCorpConfig(trx))
    .then(() => 
      asyncUtil.serialize(
          config.corporations,
          corpConfig => storeCorpConfig(trx, corpConfig)
      )
    )
    .then(() => storeSiggyConfig(trx, config))
    .then(() => setFirstAccountAsAdmin(trx));
  });
}

function dropExistingCorpConfig(trx) {
  return Promise.resolve()
  .then(() => trx.builder('roleTitle').del())
  .then(() => trx.builder('memberCorporation').del());
}

function storeCorpConfig(trx, corpConfig) {
  return trx.builder('memberCorporation')
      .insert({
        corporationId: corpConfig.id,
        apiKeyId: corpConfig.keyId,
        apiVerificationCode: corpConfig.vCode,
        membership: corpConfig.primary ? 'full' : 'affiliated',
      })
  .then(() => {
    if (corpConfig.titles) {
      let rows = [];
      for (const title in corpConfig.titles) {
        rows.push({
          corporation: corpConfig.id,
          title: title,
          role: corpConfig.titles[title]
        });
      }
      return trx.builder('roleTitle')
          .insert(rows);
    }
  });
}

function storeSiggyConfig(trx, config) {
  if (config.siggy) {
    return trx.setConfig({
      'siggyUsername': config.siggy.username,
      'siggyPassword': config.siggy.password,
    });
  }
}

function setFirstAccountAsAdmin(trx) {
  return Promise.resolve()
  .then(() => {
    return trx.builder('roleExplicit')
        .del()
        .where('role', '=', '__admin');
  })
  .then(() => {
    return trx.builder('account')
        .select('account.id', 'character.name')
        .join('character', 'character.id', '=', 'account.mainCharacter')
        .whereNotNull('account.mainCharacter')
        .orderBy('account.id')
        .limit(1);
  })
  .then(([row]) => {
    console.log(`Setting account ${row.id} (${row.name}) as admin...`);
    return trx.builder('roleExplicit')
        .insert({
          account: row.id,
          role: '__admin',
        })
    .then(() => {
      return accountRoles.updateAccount(trx, row.id);
    });
  });
}

function die(message) {
  console.error('FATAL: ' + message);
  process.exit(2);
}

let HELP =
`
quicksetup
Development tool for skipping the server setup flow in the client UI. Imports
all of the relevant config info from a file. Overwrites any previous server
configuration.

Do not use this in production.

Usage:
$ node bin/quicksetup.js import <filename>  # Import a config file
$ node bin/quicksetup.js example            # Print an example config file
$ node bin/quicksetup.js help               # This message
`

let EXAMPLE_INPUT =
`{
  corporations: [
    {
      // SAFE
      id: 98477920,
      primary: true,
      keyId: 977...,
      vCode: "0n47ym3NN...",
      titles: {
        "Staff": "admin",
        "Demi-dog": "admin",
        "Official SOUND FC": "full_member",
        "Junior SOUND FC": "limited_member"
      }
    },
    {
      // FRNT
      id: 98477920,
      primary: false,
      keyId: 977...,
      vCode: "0n47ym3NN...",
      titles: {
        "Barf": "space_dog",
      }
    },
  ],
  siggy: {
    username: "spai",
    password: "ronnie",
  },
}`;

main();
