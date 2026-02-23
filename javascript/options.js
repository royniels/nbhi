let options = {
  prefix: 'db',
  structure: 'flat',
  directory: '/components',
  aliases: {},
  keyValueAttributes: {},
  booleanAttributes: {},
  blackList: [],
};

export { initialize, get };

function initialize(given) {
  options = { ...options, ...given };

  if (options?.prefix.length < 1 && options?.prefix.length > 4) {
    throw new Error('data-prefix needs to be between 1 and 4 characters long');
  }

  if (!['flat', 'tree'].includes(options?.structure)) {
    throw new Error('Structure needs to be either: flat or tree');
  }
}

function get() {
  return options;
}