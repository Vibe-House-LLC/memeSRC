/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["stripeKey"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/* Amplify Params - DO NOT EDIT
  ENV
  FUNCTION_MEMESRCUSERFUNCTION_NAME
  REGION
Amplify Params - DO NOT EDIT */

const aws = require('aws-sdk');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const queryStringParameters = event.queryStringParameters

  const handleGiveUserCredits = async (checkoutSessionId) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Create the request object to invoke the user function
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        path: `/function/magic69/addCredits`,
        body: JSON.stringify({
          checkoutSessionId
        })
      }),
    };

    console.log('THE REQUEST')
    console.log(invokeRequest)

    // Invoke the user function and wait for the result
    const UserFunctionResults = await lambdaClient.send(new InvokeCommand(invokeRequest));
    console.log('UserFunction RESULTS')
    console.log(UserFunctionResults)

    // Convert the Uint8Array to a string
    const UserFunctionString = new TextDecoder().decode(UserFunctionResults.Payload);

    // Parse the result of the user function
    console.log('UserFunction STRING')
    console.log(UserFunctionString);
    const UserFunctionJson = JSON.parse(UserFunctionString);

    console.log('RETURNED FROM UserFunction')
    console.log(UserFunctionJson)

    return UserFunctionJson
  }

  function addURLParam(url, status) {
    // Create a URL object
    let urlObj = new URL(url);
    
    // Check if there are any existing search params
    if (urlObj.search) {
        // If there are, just add our param to the end
        urlObj.searchParams.append('paymentComplete', status);
    } else {
        // If there aren't any, set our param as the first one
        urlObj.searchParams.set('paymentComplete', status);
    }

    // Return the new URL
    return urlObj.toString();
}

  // Get stripe key
  const { Parameters } = await (new aws.SSM())
    .getParameters({
      Names: ["stripeKey"].map(secretName => process.env[secretName]),
      WithDecryption: true,
    })
    .promise();
  const stripeKey = Parameters.find(param => param.Name === process.env['stripeKey']).Value;
  const stripe = require('stripe')(stripeKey);

  // Lets get the checkout session
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    queryStringParameters.checkoutSessionId
  );
  console.log('Checkout Session')
  console.log(checkoutSession)

  // Now lets get the details we need
  const pageToReturnTo = checkoutSession.metadata.callbackUrl
  console.log('Page To Return To')
  console.log(pageToReturnTo)

  const paymentStatus = checkoutSession.payment_status
  console.log('paymentStatus')
  console.log(paymentStatus)

  const customerId = checkoutSession.customer
  console.log('customerId')
  console.log(customerId)

  const status = checkoutSession.status
  console.log('status')
  console.log(status)

  const checkoutSessionId = checkoutSession.id
  console.log('checkoutSessionId')
  console.log(checkoutSessionId)
  
  try {
    const updateUsersCredits = await handleGiveUserCredits(checkoutSessionId);
    console.log('updateUsersCredits')
    console.log(updateUsersCredits)

    return {
      statusCode: 302,
      //  Uncomment below to enable CORS requests
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        Location: addURLParam(pageToReturnTo, 'Subscription was successful!')
      }
    };
  } catch (error) {
    console.log(JSON.stringify(error))
    return {
      statusCode: 302,
      //  Uncomment below to enable CORS requests
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        Location: addURLParam(pageToReturnTo, 'There was an error with your subscription.')
      }
    };
  }
};
