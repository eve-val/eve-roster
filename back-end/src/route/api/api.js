const express = require('express');


// /api routes
const router = express.Router();

router.get('/*', function(req, res, next) {
  // TODO: Check to make sure account ID is still valid
  // and that account has permissions to access this path
  if (req.session.accountId == null) {
    res.status(401).send('401 Unauthorized');
  } else {
    next();
  }
});

router.get('/dashboard', require('./dashboard'));

router.get('/roster', require('./roster'));

router.get('/character/:id', require('./character'));
router.get('/character/:id/skills', require('./character/skills'));
router.get('/character/:id/skillQueue', require('./character/skillQueue'));

router.get('/corporation/:id', require('./corporation'));

module.exports = router;
