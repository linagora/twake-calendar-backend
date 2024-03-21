const { OBJECT_TYPE } = require('../constants');

module.exports = dependencies => {
  const peopleModule = dependencies('people');
  const searcher = require('./searcher')(dependencies);
  const denormalizer = require('./denormalizer')(dependencies);

  return {
    init
  };

  function init() {
    peopleModule.service.addSearcher(new peopleModule.PeopleSearcher(OBJECT_TYPE, searcher, denormalizer));
  }
};
