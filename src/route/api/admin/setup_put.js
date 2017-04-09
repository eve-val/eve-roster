const _ = require('underscore');
const Promise = require('bluebird');

const censor = require('./_censor');
const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const UserVisibleError = require('../../../error/UserVisibleError');


module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireWrite('serverConfig', false);

  let config = req.body;

  return dao.transaction(trx => {
    return Promise.resolve()
    .then(() => {
      verifyConfig(config);
      return storeCorpConfigs(trx, config.corporations);
    })
    .then(() => {
      if (config.siggy && !censor.isCensored(config.siggy.password)) {
        return trx.config.setSiggyCredentials(
            config.siggy.username, config.siggy.password);
      }
    })
    .then(() => {
      return trx.logEvent(
          account.id,
          'MODIFY_SERVER_CONFIG',
          null,
          censorConfigForLogging(config));
    })
    .then(() => {
      return {};
    });
  });
});

function storeCorpConfigs(trx, corpConfigs) {
  return Promise.resolve()
  .then(() => {
    return trx.config.getMemberCorporations();
  })
  .then(existingConfigs => {
    let processedConfigs = corpConfigs.map(newConfig => {
      return processNewCorpConfig(
          newConfig,
          _.findWhere(existingConfigs, { corporationId: newConfig.id }));
    });
    let titleMappings = extractTitleMappings(corpConfigs);
    return trx.config.setMemberCorpConfigs(processedConfigs, titleMappings);
  });
}

function processNewCorpConfig(newConfig, existingConfig) {
  processed = Object.assign({}, existingConfig);
  processed.corporationId = newConfig.id;
  processed.membership = newConfig.membership;
  if (!censor.isCensored(newConfig.keyId)) {
    processed.apiKeyId = newConfig.keyId
  }
  if (!censor.isCensored(newConfig.vCode)) {
    processed.apiVerificationCode = newConfig.vCode;
  }

  if (processed.apiKeyId == null) {
    die('keyId must also be specified', newConfig);
  }
  if (processed.apiVerificationCode == null) {
    die('vCode must also by specified.', newConfig);
  }

  return processed;
}

function extractTitleMappings(corpConfigs) {
  let mappings = [];
  for (let corpConfig of corpConfigs) {
    for (let title in corpConfig.titles) {
      mappings.push({
        corporation: corpConfig.id,
        title: title,
        group: corpConfig.titles[title],
      });
    }
  }
  return mappings;
}


function verifyConfig(config) {
  if (typeof config != 'object') {
    die('Root element must be an object');
  }

  requiredField(config, 'corporations', Array);
  verifyCorporationsArray(config.corporations);

  optionalField(config, 'siggy', 'object');
  if (config.siggy) {
    requiredField(config.siggy, 'username', 'string');
    requiredField(config.siggy, 'password', 'string');
  }
}

function verifyCorporationsArray(config) {
  let hasAtLeastOnePrimary = false;
  for (let corp of config) {
    verifyCorporation(corp);
    hasAtLeastOnePrimary |= corp.membership == 'full';
  }
  if (config.length > 0 && !hasAtLeastOnePrimary) {
    die('At least one corporation must be marked \'membership: "full"\'.');
  }
}

function verifyCorporation(config) {
  requiredField(config, 'id', 'number');
  requiredField(config, 'membership', 'string');
  requiredField(config, 'keyId', 'string');
  requiredField(config, 'vCode', 'string');

  for (let v in config.titles) {
    if (typeof config.titles[v] != 'string') {
      die(`Invalid group for title "${v}". must be a string.`);
    }
  }
}

function optionalField(obj, varname, type) {
  if (obj[varname] != undefined) {
    requiredField(obj, varname, type);
  }
}

function requiredField(obj, varname, type) {
  let val = obj[varname];
  if (val == undefined) {
    die(`Missing required field "${varname}" in object `
        + JSON.stringify(obj, null, 2));
  }
  if (typeof type == 'function') {
    if (!(val instanceof type)) {
      die(`Wrong type on field "${varname}". Required: ${type.name}. In object `
          + JSON.stringify(obj, null, 2));
    }
  }
  if (typeof type == 'string') {
    if (typeof val != type) {
      die(`Wrong type on field "${varname}". Required: ${type}. In object `
          + JSON.stringify(obj, null, 2));
    }
  }
}

function die(message, relatedObj) {
  if (relatedObj) {
    message += ` In object ${JSON.stringify(obj, null, 2)}`;
  }
  throw new UserVisibleError(message);
}

const SENSITIVE_STR_CHANGED_INDICATOR = '___CHANGED___';

function censorConfigForLogging(config) {
  if (config.siggy && !censor.isCensored(config.siggy.password)) {
    config.siggy.password = SENSITIVE_STR_CHANGED_INDICATOR;
  }
  for (let corpConfig of config.corporations) {
    if (!censor.isCensored(corpConfig.keyId)) {
      corpConfig.keyId = SENSITIVE_STR_CHANGED_INDICATOR;
    }
    if (!censor.isCensored(corpConfig.vCode)) {
      corpConfig.vCode = SENSITIVE_STR_CHANGED_INDICATOR;
    }
  }

  return config;
}
