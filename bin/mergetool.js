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

const accountGroups = require('../src/data-source/accountGroups');
const dao = require('../src/dao');
const UserVisibleError = require('../src/error/UserVisibleError');
const logger = require('../src/util/logger')(__filename)


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
  // Test for duplicate accounts
  if (_.uniq(accounts, false, account => account.id).length
          != accounts.length) {
    console.error('You cannot merge an account with itself.');
    process.exit();
  }

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
  logger.info(`Beginning account merge`);

  let targetAccountId = accounts[0].id;
  let deadAccounts = _.pluck(accounts, 'id').slice(1);
  logger.info('targetAccountId', targetAccountId);
  logger.info('deadAccounts', deadAccounts);

  return dao.transaction(trx => {
    logger.info('Transferring character ownership...');
    return trx.builder('ownership')
        .update({
          account: targetAccountId
        })
        .whereIn('account', deadAccounts)
    .then(count => {
      logger.info('  Modified %s rows', count);

      logger.info('Dropping account groups...');
      return trx.builder('accountGroup')
          .del()
          .whereIn('account', deadAccounts);
    })
    .then(count => {
      logger.info('  Modified %s rows', count);

      logger.info('Relinking audit logs...');
      return trx.builder('accountLog')
          .update({
            account: targetAccountId
          })
          .whereIn('account', deadAccounts);
    })
    .then(count => {
      logger.info('  Modified %s rows', count);

      logger.info('Deleting older accounts...');
      return trx.builder('account')
          .del()
          .whereIn('id', deadAccounts);
    })
    .then(count => {
      logger.info('  Modified %s rows', count);

      return trx.logEvent(targetAccountId, 'MERGE_ACCOUNTS', null, {
        targetAccount: accounts[0],
        sourceAccounts: accounts.slice(1),
      });
    });
  })
  .then(() => {
    logger.info('Updating groups on remaining account...');
    return accountGroups.updateAccount(dao, targetAccountId);
  });
})
.then(() => {
  logger.info('Done');
})
.catch(e => {
  if (e instanceof UserVisibleError) {
    console.error(e.message);
  } else {
    logger.error(e);
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
    if (row == null || row.id == null) {
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
