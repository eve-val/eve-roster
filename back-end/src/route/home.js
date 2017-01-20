const protectedEndpoint = require('../route-helper/protectedEndpoint');


module.exports = protectedEndpoint('html', (req, res, account, privs) => {
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
