import { expect, test } from "@jest/globals";
import {
  sortBy,
  cmpNumberProp,
  cmpStringProp,
  cmpNullProp,
} from "../../src/util/sortBy.js";

test("Null sort - simple", () => {
  expect(
    sortBy(
      [{ a: null }, { a: "hello" }, { a: null }, { a: 3 }],
      cmpNullProp("a")
    )
  ).toEqual([{ a: "hello" }, { a: 3 }, { a: null }, { a: null }]);
});

test("Null sort - nulls to front", () => {
  expect(
    sortBy(
      [{ a: null }, { a: "hello" }, { a: null }, { a: 3 }],
      cmpNullProp("a", "frontNulls")
    )
  ).toEqual([{ a: null }, { a: null }, { a: "hello" }, { a: 3 }]);
});

test("Number sort - simple", () => {
  expect(
    sortBy([{ a: 7 }, { a: 1 }, { a: 4 }, { a: 3 }], cmpNumberProp("a"))
  ).toEqual([{ a: 1 }, { a: 3 }, { a: 4 }, { a: 7 }]);
});

test("Number sort - reverse", () => {
  expect(
    sortBy(
      [{ a: 7 }, { a: 1 }, { a: 4 }, { a: 3 }],
      cmpNumberProp("a", "reverse")
    )
  ).toEqual([{ a: 7 }, { a: 4 }, { a: 3 }, { a: 1 }]);
});

test("Number sort - nulls", () => {
  expect(
    sortBy([{ a: 7 }, { a: null }, { a: 4 }, { a: null }], cmpNumberProp("a"))
  ).toEqual([{ a: 4 }, { a: 7 }, { a: null }, { a: null }]);
});

test("Number sort - nulls to front", () => {
  expect(
    sortBy(
      [{ a: 7 }, { a: null }, { a: 4 }, { a: null }],
      cmpNumberProp("a", "forward", "frontNulls")
    )
  ).toEqual([{ a: null }, { a: null }, { a: 4 }, { a: 7 }]);
});

test("Number sort - extractor", () => {
  expect(
    sortBy(
      [{ a: 3 }, { a: null }, { a: 1 }, { a: null }],
      cmpNumberProp((obj) => obj.a || 2)
    )
  ).toEqual([{ a: 1 }, { a: null }, { a: null }, { a: 3 }]);
});

test("String sort - simple", () => {
  expect(
    sortBy(
      [{ a: "hello" }, { a: "world" }, { a: "hallo" }, { a: "l" }],
      cmpStringProp("a")
    )
  ).toEqual([{ a: "hallo" }, { a: "hello" }, { a: "l" }, { a: "world" }]);
});

test("String sort - reverse", () => {
  expect(
    sortBy(
      [{ a: "hello" }, { a: "world" }, { a: "hallo" }, { a: "l" }],
      cmpStringProp("a", "reverse")
    )
  ).toEqual([{ a: "world" }, { a: "l" }, { a: "hello" }, { a: "hallo" }]);
});

test("String sort - nulls", () => {
  expect(
    sortBy(
      [{ a: "hello" }, { a: null }, { a: "hallo" }, { a: null }],
      cmpStringProp("a")
    )
  ).toEqual([{ a: "hallo" }, { a: "hello" }, { a: null }, { a: null }]);
});

test("String sort - nulls to front", () => {
  expect(
    sortBy(
      [{ a: "hello" }, { a: null }, { a: "hallo" }, { a: null }],
      cmpStringProp("a", "forward", "frontNulls")
    )
  ).toEqual([{ a: null }, { a: null }, { a: "hallo" }, { a: "hello" }]);
});

test("String sort - extractor", () => {
  expect(
    sortBy(
      [{ a: "x" }, { a: null }, { a: "z" }, { a: null }],
      cmpStringProp((obj) => obj.a || "y")
    )
  ).toEqual([{ a: "x" }, { a: null }, { a: null }, { a: "z" }]);
});

test("Multi sort", () => {
  expect(
    sortBy(
      [
        { a: 7, b: "f" },
        { a: 1, b: "x" },
        { a: null, b: "a" },
        { a: 1, b: "y" },
      ],
      cmpNullProp("a"),
      cmpNumberProp("a"),
      cmpStringProp("b")
    )
  ).toEqual([
    { a: 1, b: "x" },
    { a: 1, b: "y" },
    { a: 7, b: "f" },
    { a: null, b: "a" },
  ]);
});
