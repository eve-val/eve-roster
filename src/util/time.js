const moment = require('moment');


const UNITS = [
  { tag: 'd', count: 1, },
  { tag: 'h', count: 24, },
  { tag: 'm', count: 60, },
];

module.exports = {
  shortDurationString(start, end, maxUnits) {
    maxUnits = maxUnits || UNITS.length;
    
    let timeRemaining = moment(end).diff(moment(start), 'days', true);
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
