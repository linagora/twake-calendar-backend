const DEFAULT_LOCALE = 'en';

module.exports = dependencies => {
  const i18n = dependencies('i18n');

  i18n.setDefaultConfiguration({ defaultLocale: DEFAULT_LOCALE, directory: __dirname + '/locales' });

  return {
    i18n,
    DEFAULT_LOCALE
  };
};
