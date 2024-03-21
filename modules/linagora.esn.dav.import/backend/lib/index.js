'use strict';

module.exports = function(dependencies) {
  const models = require('./models')(dependencies);
  const importer = require('./importer')(dependencies);

  return {
    init,
    models,
    importer
  };

  function init() {
    importer.init();
  }
};
