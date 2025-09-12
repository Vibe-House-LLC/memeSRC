/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    try {
        // Parse the JSON body
        const body = event?.body ? JSON.parse(event.body) : {};
        const keysInput = Array.isArray(body?.keys)
            ? body.keys
            : (body?.key ? [body.key] : []);

        if (!Array.isArray(keysInput) || keysInput.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                },
                body: JSON.stringify({ error: 'At least one storage key is required' }),
            };
        }

        const identityId = event?.requestContext?.identity?.cognitoIdentityId;
        if (!identityId) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                },
                body: JSON.stringify({ error: 'Unauthorized: missing identity' }),
            };
        }

        // Map provided keys to full S3 keys under the user's private prefix
        const s3Keys = keysInput
            .map((k) => (typeof k === 'string' ? k.trim() : ''))
            .filter((k) => k.length > 0)
            .map((k) => `private/${identityId}/${k}`);

        if (s3Keys.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                },
                body: JSON.stringify({ error: 'No valid keys provided' }),
            };
        }

        // Batch delete using deleteObjects (max 1000 per request)
        const bucket = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
        const chunkSize = 1000;
        const deleted = [];
        const errors = [];

        for (let i = 0; i < s3Keys.length; i += chunkSize) {
            const chunk = s3Keys.slice(i, i + chunkSize);
            const params = {
                Bucket: bucket,
                Delete: { Objects: chunk.map((Key) => ({ Key })) },
            };
            const resp = await s3.deleteObjects(params).promise();
            if (Array.isArray(resp?.Deleted)) {
                deleted.push(...resp.Deleted.map((d) => d.Key));
            }
            if (Array.isArray(resp?.Errors) && resp.Errors.length > 0) {
                errors.push(...resp.Errors.map((e) => ({ key: e?.Key, code: e?.Code, message: e?.Message })));
            }
        }

        console.log(`Deleted ${deleted.length} object(s). Errors: ${errors.length}`);

        const statusCode = errors.length > 0 && deleted.length === 0 ? 500 : 200;
        return {
            statusCode,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({
                message: errors.length > 0 ? 'Completed with some errors' : 'Files deleted successfully',
                deletedKeys: deleted,
                errors,
            }),
        };
        
    } catch (error) {
        console.error('Error deleting file:', error);
        
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ 
                error: 'Failed to delete file',
                details: error.message
            }),
        };
    }
};
