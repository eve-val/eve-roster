import * as http from "http";
import axios, { AxiosError } from "axios";
import { VError } from "verror";

export function errorMessage(e: unknown): string {
  if (e instanceof VError) {
    return e.message;
  } else if (e instanceof Error) {
    return e.cause != null
      ? `${e.message}: ${errorMessage(e.cause)}`
      : e.message;
  } else if (typeof e == "string") {
    return e;
  } else {
    return JSON.stringify(e);
  }
}

export function stackTrace(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return axiosErrorToString(e);
  } else if (e instanceof VError) {
    return VError.fullStack(e);
  } else if (e instanceof Error) {
    const thisStack = e.stack ?? e.message;
    return e.cause != null
      ? `${thisStack}\ncaused by: ${stackTrace(e.cause)}`
      : thisStack;
  } else {
    return `Unknown error object: ${JSON.stringify(e)}`;
  }
}

/**
 * Returns a simple error message for commonplace errors but a stack trace for
 * unexpected ones.
 */
export function gentleStackTrace(e: unknown) {
  // Add new entries here as desired
  if (axios.isAxiosError(e)) {
    return errorMessage(e);
  } else {
    return stackTrace(e);
  }
}

function axiosErrorToString(e: AxiosError<unknown, unknown>): string {
  const message = [e.message];
  if (e.request instanceof http.ClientRequest) {
    const r = e.request;
    message.push(`\n  Request:`);
    message.push(`\n    ${r.method}: ${r.protocol}://${r.host}${r.path}`);
  }
  if (e.config) {
    const c = e.config;
    message.push(`\n    Headers: ${JSON.stringify(c.headers)}`);
    if (c.data != null) {
      message.push(`\n    Data: ${JSON.stringify(c.data)}`);
    }
  }
  if (e.response) {
    const r = e.response;
    message.push(`\n  Response:`);
    message.push(`\n    Status: ${r.status} ${r.statusText}`);
    message.push(`\n    Data: ${JSON.stringify(r.data)}`);
    message.push(`\n    Headers: ${JSON.stringify(r.headers)}`);
  }
  return message.join("");
}
