/**
 * Command-line tool for merging accounts together.
 *
 * This tool can be necessary if a user does the following:
 * 1. Logs in with one of their characters.
 * 2. Logs out (or switches to another computer)
 * 3. Logs in with another character
 *
 * Instead of getting one account with two characters they'll end up with two
 * accounts containing one character each. If that happens, they'll need to bug
 * an IT person to run this script for them.
 *
 * Eventually we should add a UI feature that allows users to do this
 * themselves, but we ain't got no time for that right now.
 */

const readline = require('readline');

const _ = require('underscore');
const moment = require('moment');
const Promise = require('bluebird');

const accountRoles = require('../src/data-source/accountRoles');
const dao = require('../src/dao');
const UserVisibleError = require('../src/error/UserVisibleError');


console.log('****************************');
console.log('*    ACCOUNT MERGE TOOL    *');
console.log('****************************');
console.log('');
console.log('Merges accounts into a single account.');
console.log('');
console.log('Use this tool wisely.');
console.log('');
console.log('MAKE SURE ALL THE ACCOUNTS BELONG TO THE SAME PERSON!!!');
console.log('');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.setPrompt('> ');
rl.pause();

let accounts = [];

Promise.resolve()
.then(() => {
  return promptForAccountSummary(
      'Enter the name of any character on the first account:');
})
.then(() => {
  return promptForAccountSummary(
      'Enter the name of any character on the second account:');
})
.then(() => {
  // Always retain the oldest account, so it's not possible to bypass the
  // restrictions on changing mains.
  accounts.sort((a, b) => {
    return a.created - b.created;
  });

  console.log('*********************************************');
  console.log('');
  console.log('The following account will REMAIN:');
  console.log('');
  printAccountSummary(accounts[0]);
  console.log('');
  console.log('The following account(s) will be DELETED and their characters ' +
      'will be transferred to the first account:');
  for (let i = 1; i < accounts.length; i++) {
    console.log('');
    printAccountSummary(accounts[i]);
  }
  console.log('');
  console.log('*********************************************');
  console.log('');

  return question(rl, 'Proceed? (y/N)');
})
.then(answer => {
  if (answer.toLowerCase().trim() != 'y') {
    console.log('Nevermind then!');
    process.exit();
  }
})
.then(() => {
  let targetAccountId = accounts[0].id;
  let deadAccounts = _.pluck(accounts, 'id').slice(1);
  console.log('targetAccountId', targetAccountId);
  console.log('deadAccounts', deadAccounts);

  return dao.transaction(trx => {
    console.log('Transferring character ownership...');
    return trx.builder('ownership')
        .update({
          account: targetAccountId
        })
        .whereIn('account', deadAccounts)
    .then(count => {
      console.log('  Modified %s rows', count);
      console.log('Dropping account roles...');
      return trx.builder('accountRole')
          .del()
          .whereIn('account', deadAccounts);
    })
    .then(count => {
      console.log('  Modified %s rows', count);
      console.log('Deleting accounts...');
      return trx.builder('account')
          .del()
          .whereIn('id', deadAccounts);
    })
    .then(count => {
      console.log('  Modified %s rows', count);

      return trx.logEvent(targetAccountId, 'MERGE_ACCOUNTS', null, {
        targetAccount: accounts[0],
        sourceAccounts: accounts.slice(1),
      });
    });
  })
  .then(() => {
    console.log('Updating roles on remaining account...');
    return accountRoles.updateAccount(dao, targetAccountId);
  });
})
.then(() => {
  console.log('Done');
})
.catch(e => {
  if (e instanceof UserVisibleError) {
    console.log(e.message);
  } else {
    console.log(e);
  }
})
.then(() => {
  rl.close();
  process.exit();
});

function promptForAccountSummary(prompt) {
  console.log(prompt);
  rl.resume();
  return question(rl, '> ')
  .then(answer => {
    rl.pause();
    return getAccountSummary(answer)
  })
  .then(summary => {
    accounts.push(summary);
  });
}

function getAccountSummary(characterName) {
  let account;
  return dao.getOwnerByCharacterName(characterName.trim())
  .then(row => {
    if (row.id == null) {
      throw new UserVisibleError('No account associated with that character.');
    }
    account = row;
    return dao.getCharactersOwnedByAccount(account.id);
  })
  .then(rows => {
    account.characters = rows;
    return account;
  });
}

function question(rl, message) {
  return new Promise((resolve, reject) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
}

function printAccountSummary(account) {
  console.log('Account #%s', account.id);
  console.log('created %s',
      moment(account.created).format('dddd, MMMM Do YYYY, h:mm:ss a'));
  for (let character of account.characters) {
    console.log('- %s', character.name);
  }
}
