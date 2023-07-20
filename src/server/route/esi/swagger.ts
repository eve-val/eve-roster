import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";
import { getModifiedSwagger } from "../../data-source/esi/fetch/fetchSwagger.js";
import { BASE_URL } from "../../data-source/esi/fetch/fetchEsi.js";

export default jsonEndpoint((req, res, db, account, privs): Promise<any> => {
  privs.requireRead("api", false);
  return getModifiedSwagger(BASE_URL, req.get("host") ?? req.hostname);
});
