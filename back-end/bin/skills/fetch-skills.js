/**
 * Utility function used by other binaries.
 */
const fs = require('fs');

const axios = require('axios');
const xml2js = require('xml2js');


module.exports = function() {
  return axios.get('https://api.eveonline.com/eve/SkillTree.xml.aspx')
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
    var groupsMap = {};
    var skillsMap = {};
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      let groupId = parseInt(group.$.groupID);

      let groupMap = groupsMap[groupId];
      if (groupMap == null) {
        groupMap = {
          id: groupId,
          name: group.$.groupName,
          skills: [],
        }
        groupsMap[groupId] = groupMap;
      }
      let skills = group.rowset[0].row;
      for (let j = 0; j < skills.length; j++) {
        let skill = skills[j];
        if (skill.$.published == "1") {
          let skillObj = {
            id: parseInt(skill.$.typeID),
            groupId: groupId,
            name: skill.$.typeName,
            description: skill.description[0],
            rank: parseInt(skill.rank[0]),
            primaryAttribute: skill.requiredAttributes[0].primaryAttribute[0],
            secondaryAttribute: 
                skill.requiredAttributes[0].secondaryAttribute[0],
          }
          skillsMap[skillObj.id] = skillObj;
          groupMap.skills.push(skillObj);
        }
      }
    }

    return [skillsMap, groupsMap];
  });
}

