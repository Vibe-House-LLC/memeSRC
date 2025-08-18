// Local fallback when Amplify hasn't generated aws-exports.js
const awsExports = {
  aws_cloud_logic_custom: [
    { name: 'publicapi', endpoint: '' },
    { name: 'AdminQueries', endpoint: '' },
  ],
};

export default awsExports;

