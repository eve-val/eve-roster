import moment from "moment";

// Originally we wanted to for main-changes outside of a certain window (7 days)
// to require admin approval, but we never built the admin approval interface
// and the security improvement appears to be minimal, so we'll disable this
// for now.
const MODIFY_MAIN_WINDOW_DURATION = moment
  .duration(100, "years")
  .asMilliseconds();

export function canDesignateMain(accountCreated: number) {
  return Date.now() < accountCreated + MODIFY_MAIN_WINDOW_DURATION;
}
