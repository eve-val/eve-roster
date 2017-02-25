const Promise = require('bluebird');

const eve = require('../../eve');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');


module.exports = protectedEndpoint('json', function(req, res) {
  let corporationId = req.params.id;

  return eve.esi.corporations(corporationId).info()
  .then(function(data) {
    return {
      id: corporationId,
      name: data.corporation_name,
      alliance: data.alliance_id,
      ticker: data.ticker,
    };
  });
});
