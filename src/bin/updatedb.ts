/*
 * Command line tool for creating, updating, and/or migrating the roster
 * database's schema. After executing this script, the database sqlite file will
 * be created if it did not exist, and it will be up to date based on the schema
 * migration definitions.
 *
 * The optional argument --revert (or --rollback) can be used to undo the last
 * applied batch of schema scripts.
 *
 * Schema changes are stored in the ../schema/ directory and are applied in
 * lexicographic order. Due to this, all schema files should be named with a
 * three digit prefix that provides a clear ordering. When updated, all schema
 * changes that haven't already been applied will be invoked. This is tracked in
 * a 'knex_migrations' table in the database and is based on the file name
 * (manual editing of this table may be necessary if the schema file needs to be
 * renamed after it has already been applied to a local database).
 *
 * A schema change script must export an up and down function, both of which
 * take a knex argument and a Promise constructor. The up function is
 * responsible for applying the schema, and the down function manually rolls
 * back the changes. Both of these functions are automatically invoked inside a
 * transaction. An empty example would look like:
 *
 * ```
 * exports.up = function(knex, Promise) {
 *  return Promise.resolve();
 * };
 *
 * exports.down = function(knex, Promise) {
 *  return Promise.resolve();
 * };
 * ```
 */

import { fileURLToPath } from "url";
import { getPostgresKnex } from "../db/getPostgresKnex.js";

// Directory is relative to project root
const MIGRATE_CONFIG = {
  directory: "./schema",
};

const knex = getPostgresKnex();

export function updateDb(revert: boolean): Promise<void> {
  if (revert) {
    console.log("Reverting schema changes...");
    return knex!.migrate.rollback(MIGRATE_CONFIG).then((reverts) => {
      const batch = reverts[0];
      const scripts = reverts[1];
      if (scripts.length > 0) {
        console.log("Batch", batch, "rolled back successfully. Reverted:");
        for (let i = 0; i < scripts.length; i++) {
          console.log(scripts[i]);
        }
      } else {
        console.log("No schema changes to roll back");
      }
    });
  } else {
    // Proceed with an update to latest schema
    console.log("Updating...");
    return knex!.migrate.latest(MIGRATE_CONFIG).then((updates) => {
      const batch = updates[0];
      const scripts = updates[1];
      if (scripts.length > 0) {
        console.log("Batch", batch, "completed successfully. Applied:");
        for (let i = 0; i < scripts.length; i++) {
          console.log(scripts[i]);
        }
      } else {
        console.log("Schema already up to date");
      }
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let revert = false;
  if (process.argv.length > 2) {
    // Check if any remaining arguments are --revert or --rollback
    for (let i = 2; i < process.argv.length; i++) {
      if (process.argv[i] == "--revert" || process.argv[i] == "--rollback") {
        revert = true;
      } else {
        console.warn("Ignoring unknown argument:", process.argv[i]);
      }
    }
  }

  updateDb(revert)
    .catch((e) => {
      console.error("Migration unsuccessful");
      console.error(e);
    })
    .then(function () {
      process.exit();
    });
}
