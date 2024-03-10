import type { Tnex } from "../../../../../src/server/db/tnex/index.js";
import type { AccessToken } from "../../../../../src/server/db/tables.js";

import { getFakeTables } from "../../../../test_infra/db/FakeDb.js";

export class FakeAccessTokenDao {
  private getAllCalls = [] as number[][];
  private upsertCalls = 0;

  private updateAllCalls = {
    callCount: 0,
    updates: new Map<number, UpdateAllRow[]>(),
  };

  constructor() {}

  async getAll(db: Tnex, characterIds: number[]) {
    this.getAllCalls.push(characterIds.concat());
    await Promise.resolve();

    const tables = getFakeTables(db);

    const ids = new Set(characterIds);
    const rows = tables.accessToken.rows.filter((row) =>
      ids.has(row.accessToken_character),
    );

    return rows;
  }

  async updateAll(db: Tnex, rows: UpdateAllRow[]) {
    this.updateAllCalls.callCount++;
    await Promise.resolve();

    const tables = getFakeTables(db);

    for (const update of rows) {
      const charId = update.accessToken_character;
      const callArray = this.updateAllCalls.updates.get(charId) ?? [];
      callArray.push(update);
      this.updateAllCalls.updates.set(charId, callArray);

      tables.accessToken.updateWhere("accessToken_character", update);
    }
  }

  async upsert(
    db: Tnex,
    characterId: number,
    refreshToken: string,
    scopes: string[],
    accessTokenVal: string,
    accessTokenExpires: number,
  ) {
    this.upsertCalls++;
    await Promise.resolve();

    const tables = getFakeTables(db);

    tables.accessToken.upsertWhere("accessToken_character", {
      accessToken_character: characterId,
      accessToken_scopes: scopes,
      accessToken_refreshToken: refreshToken,
      accessToken_needsUpdate: false,
      accessToken_accessToken: accessTokenVal,
      accessToken_accessTokenExpires: accessTokenExpires,
    });
  }

  reset() {
    this.getAllCalls.length = 0;
    this.updateAllCalls.callCount = 0;
    this.updateAllCalls.updates.clear();
    this.upsertCalls = 0;
  }

  public readonly calls = (() => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get getAll() {
        return self.getAllCalls;
      },
      get updateAll() {
        return self.updateAllCalls;
      },
      get upsert() {
        return self.upsertCalls;
      },
    };
  })();
}

type UpdateAllRow = Pick<
  AccessToken,
  | "accessToken_character"
  | "accessToken_refreshToken"
  | "accessToken_accessToken"
  | "accessToken_accessTokenExpires"
  | "accessToken_needsUpdate"
>;
