import { ExtendableError } from "./ExtendableError.js";

export class NoSuchAccountError extends ExtendableError {
  constructor(accountId: number) {
    super(`No such account "${accountId}".`);
  }
}
