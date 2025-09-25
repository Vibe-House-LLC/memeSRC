import { AmplifyProjectInfo } from '@aws-amplify/cli-extensibility-helper';

type AmplifyFunctionOverrideResource = {
  addCfnResource: (
    resource: {
      type: string;
      properties: Record<string, unknown>;
    },
    logicalId: string
  ) => void;
};

const BETA_ENV_NAME = 'beta';
const BETA_DISTRIBUTION_ARN = 'arn:aws:cloudfront::458585755494:distribution/E27309Q1D0QSZZ';
const DEFAULT_DISTRIBUTION_ARN = 'arn:aws:cloudfront::458585755494:distribution/E10MX49ROQE79J';
const POLICY_LOGICAL_ID = 'LambdaCloudFrontInvalidationPolicy';

export function override(resources: AmplifyFunctionOverrideResource, amplifyProjectInfo: AmplifyProjectInfo) {
  const envName = amplifyProjectInfo?.envName ?? '';
  const distributionArn = envName === BETA_ENV_NAME ? BETA_DISTRIBUTION_ARN : DEFAULT_DISTRIBUTION_ARN;

  resources.addCfnResource(
    {
      type: 'AWS::IAM::Policy',
      properties: {
        PolicyName: 'lambda-cloudfront-invalidation-policy',
        Roles: [
          {
            Ref: 'LambdaExecutionRole',
          },
        ],
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['cloudfront:CreateInvalidation'],
              Resource: distributionArn,
            },
          ],
        },
      },
    },
    POLICY_LOGICAL_ID
  );
}
