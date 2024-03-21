const express = require('express');

module.exports = dependencies => {
  const router = express.Router();

  router.use('/resources', require('./resource')(dependencies));

  return router;
};
