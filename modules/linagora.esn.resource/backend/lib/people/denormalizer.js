const { OBJECT_TYPE } = require('../constants');

module.exports = dependencies => {
  const { Model } = dependencies('people');
  const { getEmail, getAvatarUrl } = require('../denormalize')(dependencies);

  return ({ source }) => {
    const email = new Model.EmailAddress({ value: getEmail(source) });
    const name = new Model.Name({ displayName: source.name });
    const photo = new Model.Photo({ url: getAvatarUrl(source) });

    return Promise.resolve(
      new Model.Person({
        id: String(source._id),
        objectType: OBJECT_TYPE,
        emailAddresses: [email],
        photos: [photo],
        names: [name]
      })
    );
  };
};
