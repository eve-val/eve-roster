import { htmlEndpoint } from "../infra/express/protectedEndpoint";

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

  return {
    template: "home",
    data: {
      identity: JSON.stringify(identity),
    },
  };
});
