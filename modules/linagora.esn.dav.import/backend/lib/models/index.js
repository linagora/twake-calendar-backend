'use strict';

module.exports = function(dependencies) {

  const DavImportRequest = require('./request')(dependencies);
  const DavImportItem = require('./item')(dependencies);

  return {
    DavImportRequest,
    DavImportItem
  };
};
