module.exports = dependencies => {
  const ResourceModel = require('./db/resource')(dependencies);
  const administrator = require('./administrator')(dependencies);
  const resource = require('./resource')(dependencies);
  const search = require('./search')(dependencies);
  const people = require('./people')(dependencies);

  return {
    administrator,
    db: {
      ResourceModel
    },
    resource,
    people,
    search,
    start
  };

  function start(callback) {
    search.listen();
    people.init();

    callback();
  }
};
