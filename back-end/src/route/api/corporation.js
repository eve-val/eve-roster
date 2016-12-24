const esi = require('../../esi');


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

  esi.getNoAuth('corporations/' + corporationId + '/')
  .then(function(response) {
    return {
      id: corporationId,
      name: response.data.corporation_name,
      alliance: response.data.alliance_id,
      ticker: response.data.ticker,
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
}