const handlerModule = require('./handler');
const { JOB_QUEUE } = require('../constants');

module.exports = function(dependencies) {
  const jobqueue = dependencies('jobqueue').lib;

  const importRequestModule = require('../import-request')(dependencies);
  const importItemWorker = require('./workers/import-item')(dependencies);
  const importRequestWorker = require('./workers/import-request')(dependencies);

  return {
    addFileHandler,
    getFileHandler,
    init,
    importFromFile
  };

  function addFileHandler(type, handler) {
    handlerModule.register(type, handler);
  }

  function getFileHandler(type) {
    return handlerModule.get(type);
  }

  function init() {
    jobqueue.addWorker(importItemWorker);
    jobqueue.addWorker(importRequestWorker);

  }

  function importFromFile({ file, target, user }) {
    return importRequestModule.create({
      creator: user.id,
      fileId: file._id,
      contentType: file.contentType,
      target
    })
    .then(request => jobqueue.submitJob(JOB_QUEUE.IMPORT_REQUEST, {
      requestId: request.id,
      filename: file.filename
    }));
  }
};
