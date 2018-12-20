import { jsonEndpoint } from '../../infra/express/protectedEndpoint';
import { fetchEndpoint } from '../../data-source/esi/fetchEndpoint';
import { ESI_CORPORATIONS_$corporationId } from '../../data-source/esi/endpoints';


export default jsonEndpoint(async (req, res) => {
  let corporationId = req.params.id;

  const response =
      await fetchEndpoint(ESI_CORPORATIONS_$corporationId, { corporationId });

  return {
    id: corporationId,
    name: response.name,
    alliance: response.alliance_id,
    ticker: response.ticker,
  };
});
