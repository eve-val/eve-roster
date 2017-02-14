/**
 * Return a Promise that resolves to the account row and privileges object for
 * the given id, or throws an exception if there is no such account or if they
 * are not logged in. The resolved data is an object `{account: accountRow,
 * privs: privileges}`.
 *
 * @param accountId
 * @returns {Promise}
 */

const NoSuchAccountError = require('../error/NoSuchAccountError');
const NotLoggedInError = require('../error/NotLoggedInError');

const dao = require('../dao');
const privileges = require('./privileges');

// accountId = null as a default turns any undefined argument to null, but
// doesn't change other falsey values (such as 0) that might represent a valid
// database id.
function getAccountPrivs(accountId = null) {
  return Promise.resolve()
  .then(() => {
    if (accountId == null) {
      throw new NotLoggedInError();
    }
    return dao.getAccountDetails(accountId);
  })
  .then(([accountRow]) => {
    if (accountRow == null) {
      throw new NoSuchAccountError();
    }
    return privileges.get(accountRow.id)
    .then(privs => {
      return { account: accountRow, privs: privs };
    });
  });
}

module.exports = getAccountPrivs;