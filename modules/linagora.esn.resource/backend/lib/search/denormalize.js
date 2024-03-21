'use strict';

module.exports = {
  denormalize,
  getId
};

function denormalize(resource) {
  return {
    name: resource.name,
    description: resource.description,
    type: resource.type,
    domain: resource.domain,
    creator: resource.creator,
    creation: resource.timestamps.creation,
    updatedAt: resource.timestamps.updatedAt || resource.timestamps.creation,
    deleted: resource.deleted
  };
}

function getId(resource) {
  return resource._id.toString();
}
