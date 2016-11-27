// schema.js
// - Creates and initializes an empty sqlite3 database
//   with the appropriate table schema.

var knex = require('knex')({
	client: 'sqlite3',
	connection: {
		filename: "eve-roster-db.sqlite"
	}
});

