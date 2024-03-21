'use strict';

const { IMPORT_STATUS } = require('../constants');

module.exports = function(dependencies) {
  const mongoose = dependencies('db').mongo.mongoose;
  const Schema = mongoose.Schema;
  const ObjectId = mongoose.Schema.ObjectId;

  const schema = new Schema({
    request: { type: ObjectId, ref: 'DavImportRequest', index: true, required: true },
    status: { type: String, enum: Object.values(IMPORT_STATUS), default: IMPORT_STATUS.pending, index: true },
    rawData: { type: String, required: true },
    batchId: { type: ObjectId, required: true }
  }, { timestamps: true });

  return mongoose.model('DavImportItem', schema);
};
