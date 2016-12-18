const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const dao = require('../../dao.js');

const CONFIG = require('../../config-loader').load();


module.exports = function(req, res) {
  let json =
      JSON.parse(
          fs.readFileSync(
              path.join(__dirname, '../../../api-stubs/dashboard.json'),
              'utf8'));

  json.loginParams = querystring.stringify({
    'response_type': 'code',
    'redirect_uri': 'http://localhost:8081/authenticate',
    'client_id':  CONFIG.ssoClientId,
    'scope': CONFIG.ssoScope.join(' '),
    'state': '12345',
  });

  let accountId = req.session.accountId;

  dao.builder('ownership')
      .select('character.id', 'character.name', 'accessToken.needsUpdate')
      .join('character', 'character.id', '=', 'ownership.character')
      .join('accessToken', 'accessToken.character', '=', 'ownership.character')
      .where('ownership.account', accountId)
  .then(function(rows) {
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      json.characters.unshift({
        id: row.id,
        name: row.name,
        hasApiKey: !row.needsUpdate,
        skillInTraining: null,
        queue: null,
      })
    }
    res.type('json');
    res.send(JSON.stringify(json));
  })
  .catch(function(err) {
    // TODO
    console.log('ERROR:', err);
    res.send(err);
  });
}