import { AccessToken } from "../../../src/server/db/tables.js";
import { Tnex } from "../../../src/server/db/tnex/Tnex.js";
import { FakeDbTable } from "./FakeDbTable.js";

export class FakeDbTables {
  readonly accessToken = new FakeDbTable<AccessToken>("accessToken", {
    uniqueColumns: ["accessToken_character"],
  });
}

export function buildFakeDb(): FakeDb {
  return new FakeDbWrapper() as unknown as FakeDb;
}

export function getFakeTables(fakeDb: unknown): FakeDbTables {
  if (fakeDb instanceof FakeDbWrapper) {
    return fakeDb.tables;
  } else {
    throw new Error(`Must be an instance of FakeDb`);
  }
}

export type FakeDb = Tnex & {
  tables: FakeDbTables;
};

class FakeDbWrapper {
  tables = new FakeDbTables();

  asDb() {
    return this as unknown as Tnex;
  }

  root() {
    return this.asDb();
  }

  transaction<T>(callback: (db: Tnex) => Promise<T>): Promise<T> {
    return callback(this.asDb());
  }

  asyncTransaction<T>(callback: (db: Tnex) => Promise<T>): Promise<T> {
    return callback(this.asDb());
  }
}
