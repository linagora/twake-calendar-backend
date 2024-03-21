const q = require('q');
const fileHandlerModule = require('../handler');
const { IMPORT_STATUS, JOB_QUEUE } = require('../../constants');

const TOKEN_TTL = 20000; // need to check later, 20s may not enough

module.exports = dependencies => {
  const coreUser = dependencies('user');
  const importItemModule = require('../../import-item')(dependencies);

  return {
    name: JOB_QUEUE.IMPORT_ITEM,
    handler: {
      handle,
      getTitle
    }
  };

  function handle(job) {
    const { itemId } = job.data;

    return importItemModule.getById(itemId, { populations: { request: true } })
      .then(importItem => {
        const { rawData, request } = importItem;
        const { creator: userId, target, contentType } = request;

        const fileHandler = fileHandlerModule.get(contentType);

        if (!fileHandler) {
          return Promise.reject(new Error(`No file handler for file type "${contentType}"`));
        }

        return q.denodeify(coreUser.get)(userId)
          .then(_createDavToken)
          .then(({token, user}) => fileHandler.importItem(rawData, { target, token, user }))
          .then(
            () => importItemModule.updateById(itemId, { status: IMPORT_STATUS.succeed }),
            err => importItemModule.updateById(itemId, { status: IMPORT_STATUS.failed }).then(() => Promise.reject(err))
          );
      });
  }

  function getTitle(jobData) {
    return `Import DAV item ${jobData.itemId}`;
  }

  function _createDavToken(user) {
    return q.denodeify(coreUser.getNewToken)(user, TOKEN_TTL).then(data => ({token: data.token, user}));
  }
};
