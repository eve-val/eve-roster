const fs = require('fs');
const path = require('path');

const stripJsonComments = require('strip-json-comments');
const prompt = require('prompt-sync')({ sigint: true });
const SecureConf = require('secure-conf');

const REQUIRED_CONFIGS = [
  'cookieSecret',
  'ssoClientId',
  'ssoSecretKey',
  'dbFileName',
  'primaryCorporations',
];

let loadedConfig = null;

// Check for a command-line argument that specifies the config password
let configPassword = null;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] == '--config-password' || process.argv[i] == '-p') {
    if (i < process.argv.length - 1) {
      configPassword = process.argv[i + 1];
      // Remove password arguments
      process.argv.splice(i, 2);
      break;
    } else {
      console.error('FATAL: --config-password | -p requires an argument');
      process.exit(2);
    }
  }
}

module.exports = {
  load: function() {
    if (loadedConfig == null) {
      loadedConfig = JSON.parse(stripJsonComments(
          fs.readFileSync(path.join(__dirname, '../config.default.json'),
              'utf8')));

      let clear = loadLocalConfig();
      let enc = loadEncryptedConfig();
      if (clear == null && enc == null) {
        console.error(
            'FATAL: You must create config.local.json or an encrypted config.local.enc');
        process.exit(2);
      }
      clear = clear || {};
      enc = enc || {};

      // Any properties in the encrypted file will override clear text config
      Object.assign(loadedConfig, clear, enc);
      verifyConfig(loadedConfig);
    }
    return loadedConfig;
  }
};

function loadEncryptedConfig() {
  let encoded;
  try {
    encoded = fs.readFileSync(path.join(__dirname, '../config.local.enc'),
        'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      // This can be missing if config.local.json is present
      return null;
    } else {
      throw e;
    }
  }

  // If we get here, we have the encoded content so determine password and
  // decrypt.
  let pw;
  if (configPassword) {
    // Use the password provided on CLI
    pw = configPassword;
  } else {
    // No password on the command line so read one from stdin
    pw = prompt('config.local.enc password: ', { echo: '*' });
  }

  const sconf = new SecureConf();
  let decoded = sconf.decryptContent(encoded, pw);
  if (decoded === undefined) {
    console.error('Unable to decrypt config.local.enc.');
    process.exit(2);
  }

  try {
    return JSON.parse(stripJsonComments(decoded));
  } catch(e) {
    // The wrong password still produces content, it's just junk content
    // that results in JSON parse errors
    console.error('Unable to decrypt config.local.enc, incorrect password.');
    process.exit(2);
  }
}

function loadLocalConfig() {
  let localConfig;
  try {
    localConfig = JSON.parse(stripJsonComments(
        fs.readFileSync(path.join(__dirname, '../config.local.json'), 'utf8')));
  } catch (e) {
    if (e.code === 'ENOENT') {
      // This can be missing if config.local.enc is present
      return null;
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
      console.error('Missing config param "%s" (check your config.local.json).',
          param);
      process.exit(2);
    }
  }
}
