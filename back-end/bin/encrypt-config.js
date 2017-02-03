const fs = require('fs');
const path = require('path');

const SecureConf = require('secure-conf');
const prompt = require('prompt-sync')({ sigint: true });

const MODES = {
  '--encrypt': true,
  '-e': true,
  '--decrypt': false,
  '-d': false
};

function encryptConfigFile(clearConfig, encConfig) {
  if (!fs.existsSync(clearConfig)) {
    console.error('config.local.json does not exist. Create a local config first.');
    process.exit(2);
  }

  console.log('Enter new password for encrypted config file.');
  console.log(
      'This password must be used on server launch to decrypt the config file.');

  let configPassword = null;
  while (configPassword == null) {
    configPassword = prompt('Config password: ', { echo: '*' });
    let confirm = prompt('Confirm: ', { echo: '*' });

    if (configPassword != confirm) {
      console.error('Password and confirmation do not match, please try again.');
      configPassword = null;
    }
  }

  let sconf = new SecureConf();
  let content = fs.readFileSync(clearConfig);
  let enc = sconf.encryptContent(content, configPassword);
  if (enc === undefined) {
    console.error('Failed to encrypt config file');
  } else {
    fs.writeFileSync(encConfig, enc, 'utf8');
    console.log('Configuration encrypted successfully to config.local.enc');
    let del = prompt('Delete plain-text configuration, Y/n?', 'Y').toUpperCase();

    if (del == 'Y' || del == 'YES') {
      console.log('Deleting', clearConfig);
      fs.unlinkSync(clearConfig);
    }
  }
}

function decryptConfigFile(clearConfig, encConfig) {
  if (!fs.existsSync(encConfig)) {
    console.error('config.local.enc doest not exist. Encrypt configuration first.');
    process.exit(2);
  }

  console.log('Enter password for config.local.enc');
  let pw = prompt('Password: ', {echo: '*'});

  let sconf = new SecureConf();
  let encContent = fs.readFileSync(encConfig, 'utf8');
  let content = sconf.decryptContent(encContent, pw);

  if (content == undefined) {
    console.error('Failed to decrypt config file');
  } else {
    fs.writeFileSync(clearConfig, content, 'utf8');

    console.log('Decrypted configuration successfully');
    let del = prompt('Delete encrypted configuration, Y/n?', 'Y').toUpperCase();

    if (del == 'Y' || del == 'YES') {
      console.log('Deleting', encConfig);
      fs.unlinkSync(encConfig);
    }
  }
}

// **** Application script ****

let encrypt = true;
if (process.argv.length >= 3) {
  if (process.argv.length > 3) {
    console.warn('Ignoring extraneous arguments after first');
  }

  let param = process.argv[2];
  if (param in MODES) {
    encrypt = MODES[param];
  } else {
    console.error('Unsupported argument:', param, '; must be one of:');
    for (let p in MODES) {
      if (MODES.hasOwnProperty(p)) {
        if (MODES[p]) {
          console.error(p, ': encrypt a clear text config file');
        } else {
          console.error(p, ': decrypt an already encrypted config file');
        }
      }
    }
    process.exit(1);
  }
}

let clearConfigPath = path.join(__dirname, '../config.local.json');
let encConfigPath = path.join(__dirname, '../config.local.enc');

if (encrypt) {
  console.log('Encrypting configuration...');
  encryptConfigFile(clearConfigPath, encConfigPath);
} else {
  console.log('Decrypting configuration...');
  decryptConfigFile(clearConfigPath, encConfigPath);
}
