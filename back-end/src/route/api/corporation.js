const eve = require('../../eve');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');


const STUB_OUTPUT = false;

module.exports = jsonEndpoint(function(req, res) {
  if (STUB_OUTPUT) {
    return Promise.resolve({
      id: 98477920,
      name: "Nobody in Local",
      alliance: 99000739,
    });
  }

  let corporationId = req.params.id;

  return eve.esi.corporation.get(corporationId)
  .then(function(data) {
    return {
      id: corporationId,
      name: data.corporation_name,
      alliance: data.alliance_id,
      ticker: data.ticker,
    };
  });
});
