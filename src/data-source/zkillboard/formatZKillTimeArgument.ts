import moment from "moment";
import { Moment } from "moment";

/**
 * Converts a timestamp to the format expected by the Zkillboard API.
 */
export function formatZKillTimeArgument(time: Moment) {
  const outTime = moment(time);

  // Make sure moment outputs in utc rather than local time
  outTime.utc();

  // zKillboard requires start times to end with 00, so round down to closest
  // hour.
  outTime.startOf("hour");

  // zKillboard says start time must be formatted YmdHi (as a PHP datetime) This
  // translates to 4-digit year (YYYY); padded, 1-based month (MM); padded,
  // 1-based day of month (DD); padded, 24 hour clock (HH); padded minutes (mm)
  return outTime.format("YYYYMMDDHHmm");
}
