import { ExtendableError } from "./ExtendableError";

export class NoSuchAccountError extends ExtendableError {
  constructor(accountId: number) {
    super(`No such account "${accountId}".`);
  }
}
