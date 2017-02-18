const fs = require('fs');
const path = require('path');

const stripJsonComments = require('strip-json-comments');


let data = null;

module.exports = {
  get: function() {
    if (data == null) {
      data = {};
      data.SKILLS =
          JSON.parse(
              stripJsonComments(
                  fs.readFileSync(
                      path.join(__dirname, '../data/skills.json'),
                      'utf8')));
    }
    return data;
  }
};