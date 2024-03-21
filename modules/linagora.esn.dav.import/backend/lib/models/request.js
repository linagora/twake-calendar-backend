'use strict';

module.exports = function(dependencies) {
  const mongoose = dependencies('db').mongo.mongoose;
  const Schema = mongoose.Schema;
  const ObjectId = mongoose.Schema.ObjectId;

  const schema = new Schema({
    creator: { type: ObjectId, ref: 'User', index: true, required: true },
    fileId: { type: ObjectId, required: true },
    contentType: { type: String, required: true }, // can be get from file but lets cache it here for quick access when we process import items
    target: { type: String, required: true } // path to the resouce where we want contacts/events to be imported to
  }, { timestamps: true });

  return mongoose.model('DavImportRequest', schema);
};
