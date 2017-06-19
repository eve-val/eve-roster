import { ExtendableError } from './ExtendableError';

export class MissingTokenError extends ExtendableError {
  constructor(
      public characterId: number
      ) {
    super(`Missing access token for character ${characterId}`);
  }
}
