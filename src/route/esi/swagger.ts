import { jsonEndpoint } from "../../infra/express/protectedEndpoint";

export default jsonEndpoint((req, res, db, account, privs): Promise<any> => {
  privs.requireRead("accountLogs", false);

  return Promise.resolve()
    .then(() => {
      // return axios.something()
      return {};
    })
    .then((rows) => {
      // transform the swagger json file before returning it.
      return {};
    });
});
