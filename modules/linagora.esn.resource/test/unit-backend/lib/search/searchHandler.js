'use strict';

const chai = require('chai');
const expect = chai.expect;

describe('The events listener module', function() {
  let logger, elasticsearch;

  beforeEach(function() {
    logger = {
      error: () => {},
      debug: () => {},
      info: () => {},
      warning: () => {}
    };

    this.moduleHelpers.addDep('logger', logger);
  });

  describe('The register function', function() {
    it('should add a listener into ES', function(done) {
      elasticsearch = {
        listeners: {
          addListener: options => {
            expect(options.events.add).to.exist;
            expect(options.denormalize).to.be.a.function;
            expect(options.getId).to.be.a.function;
            expect(options.type).to.exist;
            expect(options.index).to.exist;
            done();
          }
        }
      };

      this.moduleHelpers.addDep('elasticsearch', elasticsearch);

      const module = require('../../../../backend/lib/search/searchHandler')(this.moduleHelpers.dependencies);

      module.register();
    });

    it('should return addListener result', function() {
      const result = {foo: 'bar'};

      elasticsearch = {
        listeners: {
          addListener: function() {
            return result;
          }
        }
      };

      this.moduleHelpers.addDep('elasticsearch', elasticsearch);

      const module = require('../../../../backend/lib/search/searchHandler')(this.moduleHelpers.dependencies);

      expect(module.register()).to.deep.equal(result);
    });
  });
});
