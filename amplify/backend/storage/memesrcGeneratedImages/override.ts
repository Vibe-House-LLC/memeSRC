import { AmplifyS3ResourceTemplate } from '@aws-amplify/cli-extensibility-helper';

export function override(resources: AmplifyS3ResourceTemplate) {
    resources.addCfnResource(
        {
            type: 'AWS::S3::BucketPolicy',
            properties: {
                Bucket: {
                    Ref: 'S3Bucket'
                },
                PolicyDocument: {
                    Statement: [
                        {
                            Action: ['s3:GetObject'],
                            Effect: 'Allow',
                            Resource: [
                                {
                                    'Fn::Sub': 'arn:aws:s3:::${S3Bucket}/public/*'
                                }
                            ],
                            Principal: {
                                Service: 'cloudfront.amazonaws.com'
                            }
                        }
                    ]
                }
            }
        },
        'S3BucketPolicy-CloudFront-Access'
    )
}
