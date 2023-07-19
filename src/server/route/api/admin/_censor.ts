export function censor(
  str: null,
  uncensoredLen: number,
  censoredLen: number,
  censorshipChar?: string,
): null;
export function censor(
  str: string,
  uncensoredLen: number,
  censoredLen: number,
  censorshipChar?: string,
): string;
export function censor(
  str: string | null,
  uncensoredLen: number,
  censoredLen: number,
  censorshipChar?: string,
): string | null;
export function censor(
  str: string | null,
  uncensoredLen: number,
  censoredLen: number,
  censorshipChar = "*",
): string | null {
  if (str == null || str === "") {
    return str;
  } else {
    return (
      str.toString().substring(0, uncensoredLen) +
      new Array(censoredLen + 1).join(censorshipChar)
    );
  }
}

export function isCensored(value: string | null, censorshipChar = "*") {
  const testStr = censorshipChar + censorshipChar;
  return typeof value == "string" && value.indexOf(testStr) != -1;
}
