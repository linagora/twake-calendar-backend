module.exports = dependencies => {
  const mongoose = dependencies('db').mongo.mongoose;
  const { RESOURCE, DEFAULT_LIMIT, DEFAULT_OFFSET } = require('./constants');
  const pubsub = dependencies('pubsub');
  const logger = dependencies('logger');
  const ResourceModel = mongoose.model('Resource');

  return {
    create,
    get,
    getList,
    listByCursor,
    update,
    remove
  };

  function create(resource) {
    if (!resource) {
      return Promise.reject(new Error('Resource is required'));
    }

    return new ResourceModel(resource).save()
      .then(created => {
        pubsub.local.topic(RESOURCE.CREATED).publish(created);
        logger.debug(`Resource ${created._id} has been publish on ${RESOURCE.CREATED}`);

        return created;
      });
  }

  function remove(resourceId) {
    if (!resourceId) {
      return Promise.reject(new Error('Resource id is required'));
    }

    return ResourceModel
      .findOneAndUpdate(
        { _id: resourceId },
        { $set: { deleted: true } },
        { new: true }
      )
      .exec()
      .then(resource => {
        if (!resource) {
          return Promise.reject(new Error('Resource does not exist and can not be removed'));
        }

        pubsub.local.topic(RESOURCE.UPDATED).publish(resource);

        return resource;
      });
  }

  function get(id) {
    return ResourceModel.findById(id).populate('domain');
  }

  function getList(options = {}) {
    const deletedFieldValuesToQuery = options.deleted ? [true, false, null] : [false, null];

    const query = {
      deleted: {
        $in: deletedFieldValuesToQuery
      }
    };

    if (options.type) {
      query.type = options.type;
    }

    if (options.domainId) {
      query.domain = options.domainId;
    }

    return ResourceModel
      .find(query)
      .skip(+options.offset || DEFAULT_OFFSET)
      .limit(+options.limit || DEFAULT_LIMIT)
      .populate('domain')
      .sort({ 'timestamps.creation': -1 })
      .exec();
  }

  function listByCursor() {
    return ResourceModel.find().cursor();
  }

  function update(id, resource) {
    if (!resource) {
      return Promise.reject(new Error('Resource is required'));
    }

    resource.timestamps.updatedAt = Date.now();

    return ResourceModel.findOneAndUpdate({_id: id}, resource, { new: true }).exec()
      .then(updated => {
          pubsub.local.topic(RESOURCE.UPDATED).publish(updated);
          logger.debug(`Resource ${updated._id} has been publish on ${RESOURCE.UPDATED}`);

          return updated;
      });
  }
};
