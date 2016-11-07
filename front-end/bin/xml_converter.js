/**
 * Usage:
 * $ node bin/xml_converter.js path/to/xml/dump.xml > path/to/target.json
 */

let xmlParser = require('xml2json');

let path = require('path');
let fs = require('fs');

function dirtyDist() {
  return Math.random() * Math.random();
}

if (process.argv.length < 3) {
  console.error('You must specify a file to read.');
  process.exit(2);
}

let filePath = path.resolve(process.argv[2]);
let fileStr = fs.readFileSync(filePath, 'utf8');
let parsedObj = xmlParser.toJson(fileStr, {
  object: true,
  coerce: true,
  trim: true
});

let rows = parsedObj.eveapi.result.rowset.row;

let transformedRows = [];
let prevMain = null;
for (let i = 0; i < rows.length; i++) {
  let row = rows[i];
  let transformedRow = {};
  for (let v in row) {
    switch (v) {
      case 'startDateTime':
      case 'logonDateTime':
      case 'logoffDateTime':
        // Convert all dates to Unix time
        // (this probably doesn't handle time zones correctly')
        transformedRow[v] = Date.parse(row[v]);
        break;
      default:
        transformedRow[v] = row[v];
    }
  }

  // Simulate some extra data from the server that isn't contained in this XML
  // dump
  transformedRow.homeCitadel = 'Hammerheim';
  transformedRow.recentKills = Math.round(dirtyDist() * 40);
  transformedRow.recentLosses = Math.round(dirtyDist() * 20);
  transformedRow.siggyScore = Math.round(dirtyDist() * 1000);

  // Simulate the presence of alts by randomly assigning characters
  // as alts of other characters.
  let treatAsAlt = prevMain != null && Math.random() < 0.33;

  if (treatAsAlt) {
    prevMain.alts.push(transformedRow);
  } else {
    transformedRow.alts = [];
    transformedRows.push(transformedRow);
    prevMain = transformedRow;
  }
  
}

console.log(JSON.stringify(transformedRows, null, 2));