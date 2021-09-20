import { jsonEndpoint } from "../../infra/express/protectedEndpoint";
import { getModifiedSwagger } from "../../data-source/esi/fetch/fetchSwagger";
import { BASE_URL } from "../../data-source/esi/fetch/fetchEsi";

export default jsonEndpoint((req, res, db, account, privs): Promise<any> => {
  privs.requireRead("accountLogs", false);

  return Promise.resolve()
    .then(() => {
      return getModifiedSwagger(BASE_URL, req.host);
    });
});
