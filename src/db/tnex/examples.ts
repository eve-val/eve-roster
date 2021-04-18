import { val, integer, varchar } from ".";
import { Tnex } from "./Tnex";

// Step 1: Define our table schemas
// Each table should be represented by a singleton class. You'll need to create
// an instance of each class to pass to many of the DB methods. These should be
// singletons, so only create one per class!

class CatTable {
  cat_id = integer();
  cat_name = varchar();
}
const catTable = new CatTable();

class DogTable {
  dog_id = integer();
  dog_name = varchar();
  dog_bark_count = integer();
}
const dogTable = new DogTable();

class BirdTable {
  bird_id = integer();
  bird_song = varchar();
}
const birdTable = new BirdTable();

// Step 2: Write some queries!

function selectSimple(db: Tnex) {
  return (
    db
      // Select statements always start with a call to select(table)
      .select(catTable)

      // Narrow it down with where(), andWhere(), whereNull(), etc.
      // Notice the use of val() to reference a constant value. Anything not
      // wrapped in val() will be interpreted as a column name.
      .where("cat_id", "=", val(5))

      // Specifies what columns we want to select. If your Promise is returning
      // {} for some reason, you forgot to call this :)
      .columns("cat_id", "cat_name")

      // Call this when you're done. Returns a Promise.
      .run()
  );
}

function selectBasicModifiers(db: Tnex) {
  return (
    db
      .select(dogTable)

      // Standard SQL modifies. See Joiner.ts for comprehensive list.
      .limit(40)
      .groupBy("dog_name")
      .distinct("dog_id")
      .orderBy("dog_id", "asc")

      .columns("dog_id", "dog_bark_count")
      .run()
  );
}

function selectAggregators(db: Tnex) {
  return (
    db
      .select(dogTable)
      .groupBy("dog_name")

      // Aggregator methods (sum, min, max, etc) require a second parameter
      // which specifies the name of the result column. The result column is
      // automatically selected for you.
      .sum("dog_bark_count", "totalBarks")

      .run()
  );
}

function performSimpleJoin(db: Tnex) {
  return (
    db
      .select(catTable)

      // join() and leftJoin() take a table to join on an a join condition.
      // The left side of the join condition must be a column name in the
      // new table (dogTable in this case). The right side of the join
      // condition must be a column name in one of the already joined tables
      // (just catTable in this case).
      .join(dogTable, "dog_id", "=", "cat_id")

      .columns("cat_name", "dog_id")
      .run()
  );
}
