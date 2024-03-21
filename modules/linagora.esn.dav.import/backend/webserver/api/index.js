'use strict';

const express = require('express');

module.exports = function(dependencies, lib) {

  const router = express.Router();

  require('./import')(dependencies, lib, router);

  return router;
};
