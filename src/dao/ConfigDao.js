const asyncUtil = require('../util/asyncUtil');


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

  getMemberCorporations() {
    return this._builder('memberCorporation')
        .select(
            'corporationId',
            'membership',
            'apiKeyId',
            'apiVerificationCode');
  }
}