/**
 * Generates a set of skills for a character. Assigns levels randomly.
 * 
 * Usage:
 * $ node bin/generateFakeSkills.js > path/to/target.json
 */

const fs = require('fs');

const axios = require('axios');
const xml2js = require('xml2js');

const GROUP_DISPLAY_ORDER = [
  257,    // Spaceship Command
  275,    // Navigation
  1216,   // Engineering
  1240,   // Subsystems
  1210,   // Armor
  1209,   // Shields

  1213,   // Targeting
  255,    // Gunnery
  256,    // Missiles
  273,    // Drones
  272,    // Electronic Systems
  1217,   // Scanning

  269,    // Rigging
  278,    // Social
  258,    // Fleet Support
  266,    // Coporation Management
  274,    // Trade
  1220,   // Neural Enhancement

  268,    // Production
  270,    // Science
  1218,   // Resource Processing
  1241,   // Planet Management
  1545,   // Structure Management
];

axios.get('https://api.eveonline.com/eve/SkillTree.xml.aspx')
  .then(function(response) {
    return new Promise((resolve, reject) => {
      xml2js.parseString(response.data, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  })
  .then(function(parsedXml) {
    let groups = parsedXml.eveapi.result[0].rowset[0].row;
    var groupsDict = {};
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      let groupId = parseInt(group.$.groupID);

      let groupDict = groupsDict[groupId];
      if (groupDict == null) {
        groupDict = {
          id: groupId,
          name: group.$.groupName,
          skills: [],
        }
        groupsDict[groupId] = groupDict;
      }
      let skills = group.rowset[0].row;
      for (let j = 0; j < skills.length; j++) {
        let skill = skills[j];
        groupDict.skills.push({
          id: skill.$.typeID,
          name: skill.$.typeName,
          level: -1,
        });
      }
    }

    let out = [];
    for (let i = 0; i < GROUP_DISPLAY_ORDER.length; i++) {
      let groupDict = groupsDict[GROUP_DISPLAY_ORDER[i]];
      out.push(groupDict);

      // Sort skills alphabetically
      groupDict.skills.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });

      // Assign levels randomly
      for (let j = 0; j < groupDict.skills.length; j++) {
        let skill = groupDict.skills[j];
        if (Math.random() < 0.5) {
          skill.level = -1;
        } else {
          skill.level = Math.ceil(Math.random() * 5);
        }
      }
    }

    console.log(JSON.stringify(out, null, 2));
  })
  .catch (function(err) {
    console.error('ERROR:', err);
  });
