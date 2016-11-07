/**
 * Usage:
 * $ node bin/xml_converter.js path/to/xml/dump.xml > path/to/target.json
 */

let xmlParser = require('xml2json');

let path = require('path');
let fs = require('fs');

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
        transformedRow[v] = Date.parse(row[v]);
        break;
      default:
        transformedRow[v] = row[v];
    }
  }
  transformedRow.homeCitadel = 'Hammerheim';
  transformedRow.recentKills = Math.round(dirtyDist() * 40);
  transformedRow.recentLosses = Math.round(dirtyDist() * 20);
  transformedRow.siggyScore = Math.round(dirtyDist() * 1000);

  let treatAsAlt = prevMain != null && Math.random() < 0.33;
  if (treatAsAlt) {
    prevMain.alts.push(transformedRow);
  } else {
    transformedRow.alts = [];
    transformedRows.push(transformedRow);
    prevMain = transformedRow;
  }
  
}

function dirtyDist() {
  return Math.random() * Math.random();
}

console.log(JSON.stringify(transformedRows, null, 2));