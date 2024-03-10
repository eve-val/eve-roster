import { checkNotNil } from "../../../src/shared/util/assert.js";

export class FakeDbTable<T> {
  private _rows: T[] = [];
  private uniqueIndices: Index<T>[] = [];

  constructor(
    private readonly name: string,
    config: {
      uniqueColumns: (keyof T & string)[];
    },
  ) {
    for (const uniqueCol of config.uniqueColumns) {
      this.uniqueIndices.push({
        column: uniqueCol,
        map: new Map(),
      });
    }
  }

  get rows() {
    return this._rows;
  }

  initialize(rows: T[]) {
    for (const row of rows) {
      this.insert(row);
    }
  }

  insert(row: T) {
    for (const index of this.uniqueIndices) {
      const value = row[index.column];
      if (index.map.has(value)) {
        throw new Error(
          `Row violates unique constraint on column ${index.column}. Row=` +
            JSON.stringify(row),
        );
      } else {
        index.map.set(value, row);
      }
    }
    this._rows.push(row);
  }

  deleteWhere<K extends keyof T & string>(column: K, value: T[K]) {
    for (let i = 0; i < this._rows.length; i++) {
      const row = this._rows[i];
      if (row[column] != value) {
        continue;
      }
      for (const index of this.uniqueIndices) {
        index.map.delete(row[index.column]);
      }
      this._rows.splice(i, 1);
      return;
    }
    throw new Error(`No row to delete where ${column}=${value}`);
  }

  /**
   * Applies the values defined in [newRow] to the matching row in the DB.
   * Throws an error if there is no matching row.
   * @param idColumn The column whose value must match between the new and stored
   *   rows. Must be a column with a unique constraint set.
   * @param newRow A row object containing the data to copy to the stored row.
   */
  updateWhere<K extends keyof T & string>(idColumn: K, newRow: Partial<T>) {
    const row = this.requireRow(idColumn, checkNotNil(newRow[idColumn])!);
    this.checkUniqueColsAreUnchanged(row, newRow);
    Object.assign(row, newRow);
  }

  upsertWhere<K extends keyof T & string>(idColumn: K, newRow: T) {
    const row = this.getRow(idColumn, newRow[idColumn]);
    if (row == null) {
      this.insert(newRow);
    } else {
      this.checkUniqueColsAreUnchanged(row, newRow);
      Object.assign(row, newRow);
    }
  }

  getRow<K extends keyof T & string>(column: K, value: T[K]) {
    for (const index of this.uniqueIndices) {
      if (index.column == column) {
        const row = index.map.get(value);
        if (row == null) {
          throw new Error(`No row found where ${column}=${value}`);
        }
        return row;
      }
    }
    return null;
  }

  requireRow<K extends keyof T & string>(column: K, value: T[K]) {
    const row = this.getRow(column, value);
    if (row == null) {
      throw new Error(`No unique index for ${column} in table ${this.name}.`);
    }
    return row;
  }

  private checkUniqueColsAreUnchanged(storedRow: T, updateRow: Partial<T>) {
    for (const index of this.uniqueIndices) {
      if (updateRow[index.column] != storedRow[index.column]) {
        throw new Error(
          `Cannot mutate unique column ${index.column}` +
            ` from ${storedRow[index.column]} to ${updateRow[index.column]}` +
            ` in row ${JSON.stringify(storedRow)}.`,
        );
      }
    }
  }
}

interface Index<T> {
  column: keyof T & string;
  map: Map<T[keyof T & string], T>;
}
