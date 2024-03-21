'use strict';

const { IMPORT_STATUS } = require('../constants');

module.exports = function(dependencies) {
  const DavImportItem = dependencies('db').mongo.mongoose.model('DavImportItem');

  return {
    create,
    getById,
    getFinishedJobByBatchId,
    updateById
  };

  function create(data) {
    return DavImportItem.create(data);
  }

  function getById(id, options = {}) {
    let query = DavImportItem.findOne({ _id: id });

    if (options.populations) {
      if (options.populations.request) {
        query = query.populate('request');
      }
    }

    return query.exec();
  }

  function getFinishedJobByBatchId(batchId) {
    return DavImportItem.find({batchId: batchId, $or: [{ status: IMPORT_STATUS.succeed }, { status: IMPORT_STATUS.failed}]}).exec();
  }

  function updateById(itemId, modified) {
    return DavImportItem.updateOne({ _id: itemId }, { $set: modified }).exec();
  }
};
