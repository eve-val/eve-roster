import { UnauthorizedClientError } from "./UnauthorizedClientError.js";

export class NotLoggedInError extends UnauthorizedClientError {
  constructor() {
    super("Not logged in.");
  }
}
