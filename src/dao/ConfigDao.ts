import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import {
    config,
    groupTitle,
    GroupTitle,
    memberCorporation,
    MemberCorporation,
} from '../dao/tables';
import { serialize } from '../util/asyncUtil';
import { UserVisibleError } from '../error/UserVisibleError';
import { Nullable } from '../util/simpleTypes';

export interface ConfigEntries {
  siggyUsername: string,
  siggyPassword: string,
  srpJurisdiction: { start: number, end: number | undefined },
  killmailSyncRanges: { [key: number]: { start: number, end: number } }
}

export default class ConfigDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  get<K extends keyof ConfigEntries>(db: Tnex, ...names: K[]) {
    return db
        .select(config)
        .whereIn('config_key', names)
        .columns('config_key', 'config_value')
        .run()
    .then(rows => {
      let config = {} as Nullable<Pick<ConfigEntries, K>>;
      for (let row of rows) {
        config[row.config_key as K] = row.config_value as any;
      }
      return config;
    })
  }

  set(db: Tnex, values: Nullable<Partial<ConfigEntries>>) {
    return serialize(Object.keys(values), key => {
      const value = (values as any)[key];
      return db
          .update(config, { config_value: value })
          .where('config_key', '=', val(key))
          .run()
      .then(updated => {
        if (updated != 1) {
          throw new Error(`Cannot write to nonexistent config value "${key}"`);
        }
      });
    })
    .then(results => {
    })
  }

  getSiggyCredentials(db: Tnex) {
    return this.get(db, 'siggyUsername', 'siggyPassword')
    .then(config => {
      return {
        username: config.siggyUsername,
        password: config.siggyPassword,
      };
    });
  }

  setSiggyCredentials(db: Tnex, username: string | null, password: string | null) {
    return this.set(db, {
      siggyUsername: username,
      siggyPassword: password,
    });
  }

  getMemberCorporations(db: Tnex): Promise<MemberCorporation[]> {
    return db
        .select(memberCorporation)
        .columns(
            'memberCorporation_corporationId',
            'memberCorporation_membership',
            )
        .run();
  }

  setMemberCorpConfigs(
      db: Tnex,
      corpConfigs: MemberCorporation[],
      titleMappings: GroupTitle[]
      ) {
    return db.transaction(db => {
      return Promise.resolve()
      .then(() => {
        return db
            .del(groupTitle)
            .run();
      })
      .then(() => {
        return db
            .del(memberCorporation)
            .run();
      })
      .then(() => {
        if (corpConfigs.length > 0) {
          return db
              .insertAll(memberCorporation, corpConfigs);
        }
      })
      .then(() => {
        return Promise.map(titleMappings, link => {
          return db
              .insert(groupTitle, link)
          .catch(e => {
            throw new UserVisibleError(
                `Invalid title mapping "${link.groupTitle_title}" ->`
                    + ` "${link.groupTitle_group}".`
                    + ` Did you forget to create the group first?`);
          });
        });
      });
    });
  }

  getCorpTitleToGroupMapping(db: Tnex, corporationId: number) {
    return db
        .select(groupTitle)
        .where('groupTitle_corporation', '=', val(corporationId))
        .columns('groupTitle_title', 'groupTitle_group')
        .run();
  }
}
