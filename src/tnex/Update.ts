import Bluebird = require('bluebird');
import Knex = require('knex');

import { Query } from './Query';
import { Scoper } from './Scoper';


/**
 * Represents an update query in Tnex.
 */
export class Update<T extends object, F extends object>
    extends Query<T & F, number> {

  private _knex: Knex;
  private _fromTables: object[] = [];

  constructor(
      knex: Knex,
      scoper: Scoper,
      table: T,
      preppedValues: object,
      ) {
    super(
        scoper.mirror(),
        knex(scoper.getTableName(table))
            .update(preppedValues));
    this._knex = knex;
  }

  /**
   * Join another table to the update query. One of your where() clauses should
   * specify how the join is performed, e.g.
   * .where('fromTable_foo', '=', 'baseTable_bar')
   */
  public from<S extends object>(table: S): Update<T, F & S> {
    this._fromTables.push(table);
    return this;
  }

  public run(): Bluebird<number> {
    if (this._fromTables.length == 0) {
      return super.run();
    } else {
      const tableQs = new Array(this._fromTables.length).fill('??').join(',');
      const tableNames = this._fromTables.map(
          table => this._scoper.getTableName(table));
      const fromClause = this._knex.raw(tableQs, tableNames);

      const modifiedQuery = this._query.toString()
          .replace(
              ` where `,
              ` from ${fromClause} where `);

      return this._knex.raw(modifiedQuery)
      .then(response => {
        return 0;
      });
    }
  }
}
