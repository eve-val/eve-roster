import Promise = require('bluebird');

import { Tnex, Nullable, val } from '../tnex';
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

export interface ConfigEntries {
  siggyUsername: string,
  siggyPassword: string,
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
        let value = row.config_value != null
            ? JSON.parse(row.config_value)
            : null;
        config[row.config_key] = value;
      }
      return config;
    })
  }

  set(db: Tnex, values: Nullable<Partial<ConfigEntries>>) {
    return serialize(Object.keys(values), key => {
      let transformedValue = values == null
          ? null : JSON.stringify((values as any)[key]);
      return db
          .update(config, { config_value: transformedValue })
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
            'memberCorporation_apiKeyId',
            'memberCorporation_apiVerificationCode',
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
