const fs = require('fs');
const path = require('path');

module.exports = function(res, filename) {
  res.type('json');
  res.send(
      fs.readFileSync(
          path.join(__dirname, '../../../api-stubs/', filename),
          'utf8'));
}