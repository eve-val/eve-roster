export function errorMessage(error: unknown) {
  return error + "";
}

export function fullStackTrace(e: unknown) {
  if (e instanceof Error) {
    return errorToFullString(e);
  }
  return e + "";
}

function errorToFullString(e: Error) {
  let message = e.stack ?? e.message;
  if (e.cause) {
    message += `\ncaused by:` + fullStackTrace(e.cause);
  }
  return message;
}
