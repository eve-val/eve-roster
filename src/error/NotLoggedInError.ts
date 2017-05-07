import { UnauthorizedClientError } from './UnauthorizedClientError';

export class NotLoggedInError extends UnauthorizedClientError {
  constructor() {
    super('Not logged in.');
  }
}
