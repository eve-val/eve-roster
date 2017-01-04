const eve = require('../../eve');
const getStub = require('../../route-helper/getStub');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');


const CONFIG = require('../../config-loader').load();

module.exports = jsonEndpoint(function(req, res) {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('corporation.json'));
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
