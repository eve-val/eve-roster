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

let ID = {
  SOUND: 99000739,
  SAFE: 98477920,
  FRNT: 98240827,
  NRDE: 98465171,
};

let CITADELS = [
  'A Little Krabby',
  'Elation',
  'Enthusiasm',
  'Exhilaration',
  'Exuberance',
  'Flotsam',
  'Forward Ruderino Detection Array',
  'King\'s Landing',
  'Liverpool Bay',
  'Pons',
  'Roanoke',
  'Skykrab',
  'The Banana Stand',
  'The Ga733bo',
  'Witzend',
  'Absent\'s Bed and Breakfast ',
  'Astrohouse',
  'Castle Black',
  'Dumb Little Paws',
  'Hammerheim',
  'Palais du Mireille',
  'The Black Lodge',
  'Wafflehus',
];

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
      case 'characterID':
        transformedRow['characterId'] = row[v];
        break;
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
  transformedRow.recentKills = Math.round(dirtyDist() * 40);
  transformedRow.recentLosses = Math.round(dirtyDist() * 20);
  transformedRow.siggyScore = Math.round(dirtyDist() * 1000);
  if (Math.random() < 0.9) {
    transformedRow.corporationId = ID.SAFE;
  } else {
    if (Math.random() < 0.8) {
      transformedRow.corporationId = ID.FRNT;
    } else {
      transformedRow.corporationId = ID.NRDE;
    }
  }

  // Simulate the presence of alts by randomly assigning characters
  // as alts of other characters.
  let treatAsAlt = prevMain != null && Math.random() < 0.33;

  if (treatAsAlt) {
    transformedRow.homeCitadel = prevMain.homeCitadel;
    prevMain.alts.push(transformedRow);
  } else {
    transformedRow.alts = [];

    if (Math.random() > 0.9) {
      // Unassigned
      transformedRow.homeCitadel = null;
    } else {
      transformedRow.homeCitadel =
          CITADELS[Math.round(Math.random() * (CITADELS.length - 1))];
    }

    transformedRows.push(transformedRow);
    prevMain = transformedRow;
  }
  
}

console.log(JSON.stringify(transformedRows, null, 2));