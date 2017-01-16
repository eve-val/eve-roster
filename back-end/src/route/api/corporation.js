const Promise = require('bluebird');

const eve = require('../../eve');
const getStub = require('../../route-helper/getStub');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');


const CONFIG = require('../../config-loader').load();

module.exports = protectedEndpoint('json', function(req, res) {
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
