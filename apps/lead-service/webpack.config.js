const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');

module.exports = composePlugins(withNx(), (config) => {
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias['@crm/contracts'] = path.resolve(__dirname, '../../libs/contracts/src/index.ts');
  return config;
});
