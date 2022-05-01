import { ExtendableError } from "./ExtendableError.js";

export class NotFoundError extends ExtendableError {
  constructor() {
    super("Resource not found");
  }
}
