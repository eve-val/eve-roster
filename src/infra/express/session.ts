import express from "express";

export function getSession(req: express.Request) {
  if (req.session == undefined) {
    // This should never happen
    throw new Error(`Undefined session object`);
  }
  return req.session as Session;
}

export function endSession(req: express.Request) {
  // The express session type isn't marked as nullable even though this is the
  // recommended way to end a session, so we override the type system here.
  (req as any).session = null;
}

export interface Session {
  accountId?: number;
  nonce?: string;
}
