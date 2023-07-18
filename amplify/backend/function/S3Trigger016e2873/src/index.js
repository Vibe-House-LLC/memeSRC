/* Amplify Params - DO NOT EDIT
  ENV
  FUNCTION_MEMESRCUSERFUNCTION_NAME
  REGION
Amplify Params - DO NOT EDIT */

const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

exports.handler = async function (event, context) {
  // All the logging
  console.log('Received S3 event:', JSON.stringify(event, null, 2));
  console.log(event)
  console.log(event.Records[0].s3)
  console.log(event.Records)
  console.log(context)

  // Create a new Lambda client
  const lambdaClient = new LambdaClient({ region: "us-east-1" });

  // Bucket and key
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key);

  // Extract the users sub from the key
  const keyParts = key.split('/');

  if (keyParts[0] === 'protected') {

    const sourceMediaId = keyParts[2];

    // Create the request object to invoke memesrcUserFunction
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        sourceMediaId: sourceMediaId,
        path: `/trigger/addFile`,
        key,
      }),
    };

    // Invoke the user details function and wait for the result
    const userDetailsResult = await lambdaClient.send(new InvokeCommand(invokeRequest));

    // Convert the Uint8Array to a string
    const userDetailsString = new TextDecoder().decode(userDetailsResult.Payload);

    // Parse the result of the user details function
    console.log(userDetailsString);
    const userDetailsParsed = JSON.parse(userDetailsString);
    console.log(userDetailsParsed)

  }

  // Log the bucket and key
  console.log(`Bucket: ${bucket}`, `Key: ${key}`);
};