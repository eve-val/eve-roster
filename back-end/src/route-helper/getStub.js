const fs = require('fs');
const path = require('path');

module.exports = function(filename) {
  return JSON.parse(
      fs.readFileSync(
          path.join(__dirname, '../../api-stubs/', filename),
          'utf8'
      )
  );
};
