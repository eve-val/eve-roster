import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";
import { ESI_CORPORATIONS_$corporationId } from "../../data-source/esi/endpoints.js";
import { fetchEsi } from "../../data-source/esi/fetch/fetchEsi.js";
import { idParam } from "../../util/express/paramVerifier.js";

export default jsonEndpoint(async (req, _res) => {
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
