import { expect, test } from "@jest/globals";
import * as time from "../../src/util/time.js";

test("shortDurationString: output specificity = days", () => {
  expect(
    time.shortDurationString("2017-03-04T14:47:49Z", "2017-03-07T20:51:02Z", 1)
  ).toBe("3d");
});

test("shortDurationString: output specificity = days+house", () => {
  expect(
    time.shortDurationString("2017-03-04T14:47:49Z", "2017-03-07T20:51:02Z", 2)
  ).toBe("3d 6h");
});

test("shortDurationString: output specificity = days+hours+minutes", () => {
  expect(
    time.shortDurationString("2017-03-04T14:47:49Z", "2017-03-07T20:51:02Z", 3)
  ).toBe("3d 6h 3m");
});

test("shortDurationString: duration = minutes", () => {
  expect(
    time.shortDurationString("2017-03-04T14:47:49Z", "2017-03-04T14:51:02Z", 1)
  ).toBe("3m");
});

test("shortDurationString: duration = hours", () => {
  expect(
    time.shortDurationString("2017-03-04T14:47:49Z", "2017-03-04T20:51:02Z", 3)
  ).toBe("6h 3m");
});

test("shortDurationString: start and end reversed", () => {
  expect(
    time.shortDurationString("2017-03-07T20:51:02Z", "2017-03-04T14:47:49Z", 3)
  ).toBe("3d 6h 3m");
});

test("shortDurationString: undefined interpreted as now", () => {
  expect(time.shortDurationString("2017-03-07T20:51:02Z", undefined, 3)).toBe(
    time.shortDurationString("2017-03-07T20:51:02Z", Date.now(), 3)
  );
});

test("shortDurationString: empty start produces empty string", () => {
  expect(time.shortDurationString("", "2017-03-04T14:47:49Z", 3)).toBe("");
});

test("shortDurationString: empty end produces empty string", () => {
  expect(time.shortDurationString("2017-03-04T14:47:49Z", "", 3)).toBe("");
});
