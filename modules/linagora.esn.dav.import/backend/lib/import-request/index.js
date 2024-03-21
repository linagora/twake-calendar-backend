'use strict';

module.exports = function(dependencies) {
  const DavImportRequest = dependencies('db').mongo.mongoose.model('DavImportRequest');

  return {
    create,
    getById
  };

  function create(data) {
    return DavImportRequest.create(data);
  }

  function getById(id, options = {}) {
    let query = DavImportRequest.findOne({ _id: id });

    if (options.populations) {
      if (options.populations.creator) {
        query = query.populate('creator');
      }
    }

    return query.exec();
  }
};
