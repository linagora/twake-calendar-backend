'use strict';

const express = require('express');

module.exports = dependencies => {
  const application = express();

  require('./config/i18n')(dependencies, application);
  require('./config/views')(dependencies, application);

  return application;
};
