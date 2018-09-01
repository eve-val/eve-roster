import { htmlEndpoint } from '../infra/express/protectedEndpoint';

export default htmlEndpoint(async (req, res, db, account, privs) => {
  let identity = {
    account: {
      id: account.id,
    },
    access: privs.dumpForFrontend(
        [
          'roster',
          'adminConsole',
          'srp',
        ],
        false
    ),
    isMember: privs.isMember(),
  };

  return {
    template: 'home',
    data: {
      identity: JSON.stringify(identity),
    },
  };
});
