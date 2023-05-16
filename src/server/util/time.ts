import moment from "moment";

const UNITS = [
  { tag: "d", count: 1 },
  { tag: "h", count: 24 },
  { tag: "m", count: 60 },
];

/**
 * @param start moment-supported date type: ISO 8601 string, millsecond
 *    timestamp, Date object, Array of Date arguments, undefined (equiv to now)
 *    See also: https://momentjs.com/docs/#/parsing/
 * @param end Ditto, should be after start.
 * @param maxUnits [1,3] How many of [Days, Hours, Minutes] to put in result
 *    string.
 * @returns A string in the format "Xd (Yh (Zm))" or an empty string.
 */
export function shortDurationString(
  start: moment.MomentInput,
  end: moment.MomentInput,
  maxUnits?: number
): string {
  maxUnits = maxUnits || UNITS.length;

  let timeRemaining = moment(end).diff(moment(start), "days", true);
  timeRemaining = Math.abs(timeRemaining);
  const out = [];

  for (const unit of UNITS) {
    if (out.length >= maxUnits) {
      break;
    }
    timeRemaining *= unit.count;
    const unitDuration = Math.floor(timeRemaining);
    if (unitDuration > 0 || out.length > 0) {
      out.push(unitDuration + unit.tag);
    }
    timeRemaining = timeRemaining - Math.floor(timeRemaining);
  }

  return out.join(" ");
}
