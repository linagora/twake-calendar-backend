module.exports = {
  OBJECT_TYPE: 'resource',
  EVENTS: {
  },
  RESOURCE: {
    CREATED: 'resource:created',
    UPDATED: 'resource:updated',
    DELETED: 'resource:deleted'
  },
  SEARCH: {
    INDEX_NAME: 'resources.idx',
    TYPE_NAME: 'resources',
    DEFAULT_LIMIT: 20,
    DEFAULT_SORT_KEY: 'name.sort',
    DEFAULT_SORT_ORDER: 'desc'
  },
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0
};
