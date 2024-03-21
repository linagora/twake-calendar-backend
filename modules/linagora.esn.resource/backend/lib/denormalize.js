module.exports = () => {

  return {
    getEmail,
    getAvatarUrl
  };

  function getEmail(resource) {
    return resource._id + '@' + resource.domain.name;
  }

  function getAvatarUrl(resource) {
    return `/linagora.esn.resource/images/icon/${resource.icon}.svg`;
  }
};
