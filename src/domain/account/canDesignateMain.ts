import moment from "moment";

const MODIFY_MAIN_WINDOW_DURATION = moment.duration(7, "days").asMilliseconds();

export function canDesignateMain(accountCreated: number) {
  return Date.now() < accountCreated + MODIFY_MAIN_WINDOW_DURATION;
}
