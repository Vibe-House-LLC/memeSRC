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

const creditsPerPrice = {
  // Beta Prices (non-test mode on stripe)
  "price_1OziYeAqFX20vifIptXDlka4": 5,   // Pro 5 (beta)
  "price_1OziZIAqFX20vifIQ5mw6jqr": 25,  // Pro 25 (beta)
  "price_1Ozia3AqFX20vifIgwvdxsEg": 69,  // Pro 69 (beta)
  "price_1NbXguAqFX20vifI34N1MJFO": 69,  // Magic 69 (beta) - deprecated
  // Dev Prices (test mode on stripe)
  "price_1OyLVZAqFX20vifImSa8wizl": 5,   // Pro 5 (dev)
  "price_1OyLWrAqFX20vifIkrK4Oxnp": 25,  // Pro 25 (dev)
  "price_1OyLXpAqFX20vifIxTi2SMIx": 69,  // Pro 69 (dev)
  "price_1Nhc9UAqFX20vifI0mYIzSfs": 69,  // Magic 69 (dev) - deprecated
};

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const queryStringParameters = event.queryStringParameters

  const handleGiveUserCredits = async (checkoutSessionId, periodStart, periodEnd, creditsPerMonth, stripeCustomerId) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Create the request object to invoke the user function
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        path: `/function/pro/addCredits`,
        body: JSON.stringify({
          checkoutSessionId,
          periodStart,
          periodEnd,
          creditsPerMonth,
          stripeCustomerId
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

  const invoiceId = checkoutSession.invoice
  console.log('invoiceId')
  console.log(invoiceId)
  
  try {
    // First lets pull the invoice
    const invoice = await stripe.invoices.retrieve(
      invoiceId
    );

    // Now lets check the invoice to get the start and end times
    console.log('THE INVOICE', JSON.stringify(invoice))

    const periodStart = invoice['period_start']
    console.log('periodStart', periodStart)
    const periodEnd = invoice['period_end']
    console.log('periodEnd', periodEnd)

    const creditsPerMonth = creditsPerPrice[invoice.lines.data[0].price.id]
    const stripeCustomerId = invoice.customer

    // Then lets update the user details
    const updateUsersCredits = await handleGiveUserCredits(checkoutSessionId, periodStart, periodEnd, creditsPerMonth, stripeCustomerId);
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
