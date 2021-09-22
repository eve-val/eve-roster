import querystring from "querystring";
import { htmlEndpoint } from "../infra/express/protectedEndpoint";
import { getSession } from "../infra/express/session";

export default htmlEndpoint(async (req, res, db, account, privs) => {
  const identity = {
    account: {
      id: account.id,
    },
    access: privs.dumpForFrontend(
      ["roster", "adminConsole", "characterShips", "srp", "api"],
      false
    ),
    isMember: privs.isMember(),
  };
  const session = getSession(req);

  return {
    template: "home",
    data: {
      identity: JSON.stringify(identity),
      csrf: JSON.stringify(req.csrfToken()),
      nonce: JSON.stringify(querystring.escape(session.nonce || "")),
    },
  };
});
