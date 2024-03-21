const { expect } = require('chai');

describe('The lib/importer/handler module', function() {
  let getModule;
  let handler;

  beforeEach(function() {
    handler = {
      readLines: () => {},
      importItem: () => {},
      targetValidator: () => {}
    };

    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/importer/handler`);
  });

  describe('The register function', function() {
    it('should throw error if type exists', function() {
      const type = 'foo';

      getModule().register(type, handler);

      expect(() => getModule().register(type, handler)).to.throw(Error, `handler for type "${type}" already registere`);
    });

    it('should register a handler with multiple types', function() {
      const types = ['foo', 'bar'];

      getModule().register(types, handler);

      expect(getModule().get(types[0])).to.be.defined;
      expect(getModule().get(types[1])).to.be.defined;
    });
  });
});
