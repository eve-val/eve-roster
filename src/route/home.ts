import { htmlEndpoint } from '../route-helper/protectedEndpoint';

export default htmlEndpoint((req, res, db, account, privs) => {
  let identity = {
    account: {
      id: account.id,
    },
    access: privs.dumpForFrontend(
        [
          'roster',
          'adminConsole',
        ],
        false
    ),
  };

  return {
    template: 'home',
    data: {
      identity: JSON.stringify(identity),
    },
  };
});
