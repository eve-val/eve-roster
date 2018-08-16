import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { citadel, Citadel } from './tables';

export default class CitadelDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getAll<K extends keyof Citadel>(db: Tnex, columns: K[]) {
    return db
        .select(citadel)
        .columns(...columns)
        .run();
  }

  getById<K extends keyof Citadel>(db: Tnex, id: number, columns: K[]) {
    return db
        .select(citadel)
        .where('citadel_id', '=', val(id))
        .columns(...columns)
        .fetchFirst();
  }

  getByName<K extends keyof Citadel>(db: Tnex, name: string, columns: K[]) {
    return db
        .select(citadel)
        .where('citadel_name', '=', val(name))
        .columns(...columns)
        .fetchFirst();
  }

  setName(db: Tnex, id: number, name: string) {
    return db
        .update(citadel, { citadel_name: name })
        .where('citadel_id', '=', val(id))
        .run();
  }

  add(db: Tnex, newCitadel: Citadel) {
    return db
        .insert(citadel, newCitadel, 'citadel_id');
  }

  drop(db: Tnex, id: number) {
    return db
        .del(citadel)
        .where('citadel_id', '=', val(id))
        .run();
  }
}
