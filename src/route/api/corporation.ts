import { jsonEndpoint } from "../../infra/express/protectedEndpoint";
import { ESI_CORPORATIONS_$corporationId } from "../../data-source/esi/endpoints";
import { fetchEsi } from "../../data-source/esi/fetch/fetchEsi";
import { idParam } from "../../util/express/paramVerifier";

export default jsonEndpoint(async (req, res) => {
  const corporationId = idParam(req, "id");

  const response = await fetchEsi(ESI_CORPORATIONS_$corporationId, {
    corporationId,
  });

  return {
    id: corporationId,
    name: response.name,
    alliance: response.alliance_id,
    ticker: response.ticker,
  };
});
