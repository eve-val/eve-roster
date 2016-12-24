const eve = require('../../eve');


const STUB_OUTPUT = false;

module.exports = function(req, res) {
  if (STUB_OUTPUT) {
    res.type('json');
    res.send({
      id: 98477920,
      name: "Nobody in Local",
      alliance: 99000739,
    });
    return;
  }

  let corporationId = req.params.id;

  eve.esi.corporation.get(corporationId)
  .then(function(data) {
    return {
      id: corporationId,
      name: data.corporation_name,
      alliance: data.alliance_id,
      ticker: data.ticker,
    };
  })
  .then(function(payload) {
    res.type('json');
    res.send(payload);
  })
  .catch(function(e) {
    // TODO
    console.log(e);
    res.status(500).send('<pre>' + e.stack + '</pre>');
  });
};