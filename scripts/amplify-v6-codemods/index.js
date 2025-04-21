/**
 * Combined codemod for AWS Amplify v5 ➜ v6 migration.
 * Applies import rewrites, Auth/API/Storage method transforms, and GraphQL client migration.
 */
const importRewrites = require('./import-rewrites');
const authMethodCalls = require('./auth-method-calls');
const apiMethodCalls = require('./api-method-calls');
const storageMethodCalls = require('./storage-method-calls');
const graphqlClient = require('./graphql-client');

module.exports = function(fileInfo, api) {
  let source = fileInfo.source;
  [
    importRewrites,
    authMethodCalls,
    apiMethodCalls,
    storageMethodCalls,
    graphqlClient
  ].forEach(transform => {
    const result = transform({ ...fileInfo, source }, api);
    if (typeof result === 'string') {
      source = result;
    }
  });
  return source;
};