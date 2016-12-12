const fs = require('fs');
const path = require('path');

const REQUIRED_CONFIGS = [
  'cookieSecret',
  'ssoClientId',
  'ssoSecretKey',
  'dbFileName',
];

module.exports = {
  load: function() {
    let config = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config.default.json'), 'utf8'));
    Object.assign(config, loadLocalConfig());
    verifyConfig(config);
    return config;
  }
}

function loadLocalConfig() {
  let localConfig;
  try {
    localConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config.local.json'), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error('FATAL: You must create config.local.json');
      process.exit(2);
    } else {
      throw e;
    }
  }
  return localConfig;
}

function verifyConfig(config) {
  for (let i = 0; i < REQUIRED_CONFIGS.length; i++) {
    let param = REQUIRED_CONFIGS[i];
    if (config[param] == undefined) {
      console.error(
          'Missing config param "%s" (check your config.local.json).', param);
      process.exit(2);
    }
  }
}
