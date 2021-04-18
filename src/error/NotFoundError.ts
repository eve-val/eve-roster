import { ExtendableError } from "./ExtendableError";

export class NotFoundError extends ExtendableError {
  constructor() {
    super("Resource not found");
  }
}
