const ExtendableError = require('./ExtendableError');

class MissingTokenError extends ExtendableError {
  constructor(characterId) {
    super(`Missing access token for character ${characterId}`);
    this.characterId = characterId;
  }
}
module.exports = MissingTokenError;
