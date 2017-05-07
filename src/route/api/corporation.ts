import Promise = require('bluebird');

import { jsonEndpoint } from '../../route-helper/protectedEndpoint';
import esi from '../../esi';


export default jsonEndpoint(function(req, res) {
  let corporationId = req.params.id;

  return esi.corporations(corporationId).info()
  .then(function(data) {
    return {
      id: corporationId,
      name: data.corporation_name,
      alliance: data.alliance_id,
      ticker: data.ticker,
    };
  });
});
