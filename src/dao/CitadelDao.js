

const CitadelDao = module.exports = class {
  constructor(parent, builder) {
    this._parent = parent;
    this._builder = builder;
  }

  getAll() {
    return this._builder('citadel').select();
  }

  getById(id) {
    return this._builder('citadel').select().where('id', '=', id);
  }

  getByName(name) {
    return this._builder('citadel').select().where({name: name});
  }

  setName(id, name) {
    return this._builder('citadel').update({ name: name }).where('id', '=', id);
  }

  add(name, type, allianceAccess, allianceOwned) {
    return this._builder('citadel').insert({
        name: name,
        type: type,
        allianceAccess: allianceAccess,
        allianceOwned: allianceOwned,
      })
      .then(([id]) => {
        return id;
      });
  }

  drop(id) {
    return this._builder('citadel').del().where('id', '=', id);
  }
}