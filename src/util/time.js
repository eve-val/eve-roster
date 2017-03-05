const moment = require('moment');


const UNITS = [
  { tag: 'd', count: 1, },
  { tag: 'h', count: 24, },
  { tag: 'm', count: 60, },
];

module.exports = {
  // start:    moment-supported date type: ISO 8601 string, millsecond timestamp,
  //           Date object, Array of Date arguments, undefined (equiv to now)
  //           See also: https://momentjs.com/docs/#/parsing/
  // end:      ditto, should be after start
  // maxUnits: [1,3] How many of [Days, Hours, Minutes] to put in result string
  // returns:  A string in the format "Xd (Yh (Zm))" or an empty string
  shortDurationString(start, end, maxUnits) {
    maxUnits = maxUnits || UNITS.length;
    
    let timeRemaining = moment(end).diff(moment(start), 'days', true);
    timeRemaining = Math.abs(timeRemaining);
    let out = [];
    
    for (let unit of UNITS) {
      if (out.length >= maxUnits) {
        break;
      }
      timeRemaining *= unit.count;
      let unitDuration = Math.floor(timeRemaining);
      if (unitDuration > 0 || out.length > 0) {
        out.push(unitDuration + unit.tag);
      }
      timeRemaining = timeRemaining - Math.floor(timeRemaining);
    }

    return out.join(' ');
  },
};

if (require.main === module) {
  const path = require('path');
  const runTest = (testName, start, end, maxUnits, expected) => {
    const actual = module.exports.shortDurationString(start, end, maxUnits);
    if (actual !== expected) {
      console.error(`${testName} expected: ${expected} got: ${actual}`);
    }
  };
  console.log(`Running tests for ${path.basename(__filename)}...`);
  runTest('testDays',
    '2017-03-04T14:47:49Z', '2017-03-07T20:51:02Z', 1, '3d');
  runTest('testDaysHours',
    '2017-03-04T14:47:49Z', '2017-03-07T20:51:02Z', 2, '3d 6h');
  runTest('testDaysHoursMinutes',
    '2017-03-04T14:47:49Z', '2017-03-07T20:51:02Z', 3, '3d 6h 3m');
  runTest('testOnlyMinutes',
    '2017-03-04T14:47:49Z', '2017-03-04T14:51:02Z', 1, '3m');
  runTest('testOnlyMinutesHours',
    '2017-03-04T14:47:49Z', '2017-03-04T20:51:02Z', 3, '6h 3m');
  // Treat reversed start and end as a duration
  runTest('testStartEndReversed',
    '2017-03-07T20:51:02Z', '2017-03-04T14:47:49Z', 3, '3d 6h 3m');
  // undefined gets interpreted as Date.now()
  runTest('testEndUndefined',
    '2017-03-07T20:51:02Z', undefined, 3,
    module.exports.shortDurationString('2017-03-07T20:51:02Z', Date.now(), 3));
  // empty strings give back empty strings - they turn into NaN durations
  runTest('testStartEmptyString',
    '', '2017-03-04T14:47:49Z', 3, '');
  runTest('testEndEmptyString',
    '2017-03-04T14:47:49Z', '', 3, '');
}
