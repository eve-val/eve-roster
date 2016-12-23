const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const moment = require('moment');

const dao = require('../../dao.js');
const esi = require('../../esi.js');
const skillQueue = require('../../data-source/skill-queue');

const STATIC = require('../../static-data').get();
const CONFIG = require('../../config-loader').load();

const SKILL_LEVEL_LABELS = ['0', 'I', 'II', 'III', 'IV', 'V'];

const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': 'http://localhost:8081/authenticate',
  'client_id':  CONFIG.ssoClientId,
  'scope': CONFIG.ssoScope.join(' '),
  'state': '12345',
});

const STUB_OUTPUT = false;

module.exports = function(req, res) {
  (STUB_OUTPUT
    ? getStubOutput()
    : getRealOutput(req.session.accountId))
  .then(function(output) {
    let space = req.query.pretty != undefined ? 2 : undefined;

    res.type('json');
    res.send(JSON.stringify(  output, null, space));
  })
  .catch(function(err) {
    // TODO
    console.log('ERROR:', err);
    res.send(err.toString());
  });
}

function getStubOutput() {
  let json = JSON.parse(
      fs.readFileSync(
          path.join(__dirname, '../../../api-stubs/dashboard.json'),
          'utf8'));
  json.loginParams = LOGIN_PARAMS;

  return Promise.resolve(json);
}

function getRealOutput(accountId) {
  let mainCharacter = null;
  return Promise.resolve()
  .then(function() {
    return dao.builder('account')
        .select('mainCharacter')
        .where('id', '=', accountId)
  })
  .then(function(rows) {
    mainCharacter = rows[0].mainCharacter;
  })
  .then(function() {
    return dao.builder('ownership')
      .select('character.id', 'character.name', 'accessToken.needsUpdate')
      .join('character', 'character.id', '=', 'ownership.character')
      .join('accessToken', 'accessToken.character', '=', 'ownership.character')
      .where('ownership.account', accountId);
  })
  .then(function(rows) {
    let workList = [];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      workList.push(
        skillQueue
        .getQueue(row.id)
        .then(function(queueData) {
          return {
            id: row.id,
            name: row.name,
            hasApiKey: !row.needsUpdate,
            skillInTraining: getSkillInTraining(queueData),
            queue: getQueue(queueData),
          };
        })
      );
    }
    return Promise.all(workList);
  })
  .then(function(characters) {
    return {
      characters: characters,
      loginParams: LOGIN_PARAMS,
      mainCharacter: mainCharacter,
    };
  })
}

function getSkillInTraining(queueData) {
  let skillInTraining = null;
  if (queueData.length > 0) {
    let skill0 = queueData[0];
    let skillName = STATIC.SKILLS[skill0.skill_id].name;
    let skillLevelLabel = SKILL_LEVEL_LABELS[skill0.finished_level];

    skillInTraining = {
      name: skillName + ' ' + skillLevelLabel,
      progress: skillQueue.getProgress(skill0),
      timeRemaining: getDurationString(skill0.finish_date),
    }
  }
  return skillInTraining;
}

function getQueue(queueData) {
  let queue = null;
  if (queueData.length > 0) {
    let finalSkill = queueData[queueData.length - 1];
    queue = {
      count: queueData.length,
      timeRemaining: getDurationString(finalSkill.finish_date),
    }
  }
  return queue;
}

function getDurationString(timestr) {
  // There must be a better way....
  let daysRemaining =
        moment(timestr).diff(moment(), 'days', true);
  let hoursRemaining = 24 * (daysRemaining - Math.floor(daysRemaining));
  let minsRemaining = 60 * (hoursRemaining - Math.floor(hoursRemaining));
  let timeRemaining;
  if (daysRemaining >= 1) {
    timeRemaining =
        Math.floor(daysRemaining) + 'd ' + Math.round(hoursRemaining) + 'h';
  } else if (hoursRemaining >= 1) {
    timeRemaining =
        Math.floor(hoursRemaining) + 'h ' + Math.round(minsRemaining) + 'm';
  } else {
    timeRemaining = Math.round(minsRemaining) + 'm';
  }
  return timeRemaining;
}