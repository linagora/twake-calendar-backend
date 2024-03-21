'use strict';

module.exports = function(dependencies, lib) {
  const logger = dependencies('logger');

  return {
    importFromFile
  };

  function importFromFile(req, res) {
    const options = {
      user: req.user,
      target: req.body.target,
      file: req.fileMetaData
    };

    lib.importer.importFromFile(options)
      .then(() => res.status(202).end())
      .catch(err => {
        const details = 'Error while importing DAV items from file';

        logger.error(details, err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details
          }
        });
      });
  }
};
