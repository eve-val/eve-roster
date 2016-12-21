const sendStub = require('./send-stub');

module.exports = function(req, res) {
  sendStub(res, 'character.json');
};
