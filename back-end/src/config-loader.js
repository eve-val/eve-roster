const fs = require('fs');

const REQUIRED_LOCAL_CONFIG = ['cookieSecret', 'ssoClientId', 'ssoSecretKey', 'dbFileName'];

module.exports = {
  load: function() {
    let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    Object.assign(config, loadLocalConfig());
    return config;
  }
}

function loadLocalConfig() {
  let localConfig;
  try {
    localConfig = JSON.parse(fs.readFileSync('config.local.json', 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error('FATAL: You must create config.local.json');
      process.exit(2);
    } else {
      throw e;
    }
  }
  verifyLocalConfig(localConfig);
  return localConfig;
}

function verifyLocalConfig(localConfig) {
  for (let i = 0; i < REQUIRED_LOCAL_CONFIG.length; i++) {
    let param = REQUIRED_LOCAL_CONFIG[i];
    if (!localConfig[param]) {
      console.error('Missing config param in config.local.json: "%s".', param);
      process.exit(2);
    }
  }
}
