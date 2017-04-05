const Promise = require('bluebird');

const asyncUtil = require('../util/asyncUtil');
const UserVisibleError = require('../error/UserVisibleError');


const ConfigDao = module.exports = class {
  constructor(parent, builder) {
    this._parent = parent;
    this._builder = builder;
  }

  get(...names) {
    return this._builder('config')
        .select('key', 'value')
        .whereIn('key', names)
    .then(rows => {
      let config = {};
      for (let row of rows) {
        config[row.key] = JSON.parse(row.value);
      }
      return config;
    })
  }

  set(values) {
    return asyncUtil.serialize(Object.keys(values), key => {
      return this._builder('config')
          .update({ value: JSON.stringify(values[key]) })
          .where('key', '=', key)
      .then(updated => {
        if (updated != 1) {
          throw new Error(`Cannot write to nonexistent config value "${key}"`);
        }
      });
    });
  }

  getSiggyCredentials() {
    return this.get('siggyUsername', 'siggyPassword')
    .then(config => {
      return {
        username: config.siggyUsername,
        password: config.siggyPassword,
      };
    });
  }

  setSiggyCredentials(username, password) {
    return this.set({
      siggyUsername: username,
      siggyPassword: password,
    });
  }

  getMemberCorporations() {
    return this._builder('memberCorporation')
        .select(
            'corporationId',
            'membership',
            'apiKeyId',
            'apiVerificationCode');
  }

  setMemberCorpConfigs(corpConfigs, titleMappings) {
    return this._parent.transaction(trx => {
      return Promise.resolve()
      .then(() => {
        return trx.builder('groupTitle')
            .del();
      })
      .then(() => {
        return trx.builder('memberCorporation')
            .del();
      })
      .then(() => {
        if (corpConfigs.length > 0) {
          return trx.builder('memberCorporation')
              .insert(corpConfigs);
        }
      })
      .then(() => {
        return Promise.map(titleMappings, link => {
          return trx.builder('groupTitle')
              .insert(link)
          .catch(e => {
            throw new UserVisibleError(
                `Invalid title mapping "${link.title}" -> "${link.group}".`
                    + ` Did you forget to create the group first?`);
          });
        });
      });
    });
  }

  getCorpTitleToGroupMapping(corporationId) {
    return this._builder('groupTitle')
        .select('title', 'group')
        .where('corporation', '=', corporationId);
  }
}
