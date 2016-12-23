const dao = require('../../dao');
const sendStub = require('./send-stub');

const STUB_OUTPUT = false;

module.exports = function(req, res) {
  if (STUB_OUTPUT) {
    sendStub(res, 'character.json');
    return;
  }

  let characterId = req.params.id;

  dao.builder('character')
      .select('name', 'corporationId', 'activeTimezone', 'homeCitadel')
      .where('id', '=', characterId)
  .then(function([row]) {
    return {
      name: row.name,
      corporationId: row.corporationId,
      activeTimezone: row.activeTimezone,
      homeCitadel: row.homeCitadel,
    };
  })
  .then(function(response) {
    let space = req.query.pretty != undefined ? 2 : undefined;
    res.type('json');
    res.send(JSON.stringify(response, null, space));
  })
  .catch(function(e) {
    // TODO
    res.status(500);
    res.send('Error :(\n' + e.toString());
    throw e;
  });

};
