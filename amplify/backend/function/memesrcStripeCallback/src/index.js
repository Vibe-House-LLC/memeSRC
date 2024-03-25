/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["stripeKey","stripeWebhookSecret"].map(secretName => process.env[secretName]),
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
  "price_1NbXguAqFX20vifI34N1MJFO": 69,  // Magic 69 (prod)
  "price_1Nhc9UAqFX20vifI0mYIzSfs": 69,  // Magic 69 (dev)
  "price_1OyLVZAqFX20vifImSa8wizl": 5,   // Pro 5 (dev)
  "price_1OyLWrAqFX20vifIkrK4Oxnp": 25,  // Pro 25 (dev)
  "price_1OyLXpAqFX20vifIxTi2SMIx": 69   // Pro 69 (dev)
};

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  console.log(event.body)

  const queryStringParameters = event.queryStringParameters
  // Get stripe key
  const { Parameters } = await (new aws.SSM())
    .getParameters({
      Names: ["stripeKey", "stripeWebhookSecret"].map(secretName => process.env[secretName]),
      WithDecryption: true,
    })
    .promise();
  const stripeKey = Parameters.find(param => param.Name === process.env['stripeKey']).Value;
  const stripeWebhookSecret = Parameters.find(param => param.Name === process.env['stripeWebhookSecret']).Value;

  const stripe = require('stripe')(stripeKey);

  const handleGiveUserCredits = async (stripeCustomerId, periodStart, periodEnd) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Create the request object to invoke the user function
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        path: `/function/magic69/renewCredits`,
        body: JSON.stringify({
          stripeCustomerId,
          periodStart,
          periodEnd
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

  const handleSetFailedPaymentStatus = async (stripeCustomerId) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Create the request object to invoke the user function
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        path: `/function/magic69/failedPayment`,
        body: JSON.stringify({
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

  const handleSetCanceledSubsciptionStatus = async (stripeCustomerId) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Create the request object to invoke the user function
    const invokeRequest = {
      FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
      Payload: JSON.stringify({
        path: `/function/magic69/cancelSubscription`,
        body: JSON.stringify({
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

  /* -------------------------------- Functions ------------------------------- */

  // This function checks to see if an invoice object contains at least one of the price ID's.
  // This includes the test price and the production price.
  function hasMatchingPriceId(invoice) {
    // Check if any line item matches the valid price IDs
    return invoice.lines.data.some(lineItem => lineItem.price.id in creditsPerPrice);
  }




  /* --------------------------- Possible Scenarios --------------------------- */

  /*************************************
  *                                    *
  *  Enjoy my books worth of comments  *
  *                                    *
  *************************************/

  const subscriptionPaymentFailed = async (stripeEvent) => {
    console.log('Subscription Payment Failed')
    console.log('Stripe Charge Object', stripeEvent)
    /* -------------------------------------------------------------------------- 
    
        This is another one that I can't fully test via the CLI.
        Luckily the docs show exactly what will be coming through, so I can write this based on the fact that the object I'm working with
        Will always be the same. Essentially, we'll be pulling the invoice from the failed payment to make sure that the price ID is for Magic 69,
        And if it is, we're going to update the user in GraphQL to set the subscriptionStatus to "paymentFailed"

     -------------------------------------------------------------------------- */

    //  Alright. Lets start by grabbing the invoice associated to the failure.
    const invoice = await stripe.invoices.retrieve(
      stripeEvent.invoice
    );
    console.log('Stripe Invoice Object', JSON.stringify(invoice))

    // Lets check to see if the test or prod price id is in the invoice
    const isSubscription = hasMatchingPriceId(invoice)
    console.log('isSubscription', isSubscription);

    if (isSubscription) {
      const stripeCustomerId = invoice.customer
      console.log('stripeCustomerId', stripeCustomerId)

      const setFailedPayment = await handleSetFailedPaymentStatus(stripeCustomerId)
      console.log('setFailedPayment', setFailedPayment)
    }
  }




  const subscriptionRenewelPaymentComplete = async (stripeEvent) => {
    console.log('Subscription Renewel Payment Complete')
    console.log('Stripe Invoice Object', JSON.stringify(stripeEvent))
    // Lets check to see if the test or prod price id is in the invoice
    const isSubscription = hasMatchingPriceId(stripeEvent)
    console.log('isSubscription', isSubscription);

    // Now we want to check if the billing_reason is subscription_cycle
    // This indicates that the invoice is coming through because their subscription has renewed.
    const isRenewel = (stripeEvent['billing_reason'] === 'subscription_cycle')
    console.log('isRenewel', isRenewel)


    // Currently I'm leaving isRenewel out of the if statement. This means that there is a double call when
    // someone first creates a subscription, but that doesn't cause any issues currently.
    // However, I cannot test that it will work, so I'd rather go with the current check which will make sure the subscription is
    // for the price id of Magic 69.
    // Once some subscriptions renew, we can check the console logs to make sure that it returned true
    // and add it into the if statement to prevent the double call to GraphQL
    if (isSubscription) {

      const stripeCustomerId = stripeEvent.customer
      console.log('stripeCustomerId', stripeCustomerId)
      const periodStart = stripeEvent.period_start
      console.log('periodStart', periodStart)
      const periodEnd = stripeEvent.period_end
      console.log('periodEnd', periodEnd)

      const renewUsersCredits = await handleGiveUserCredits(stripeCustomerId, periodStart, periodEnd)
      console.log('renewUsersCredits', renewUsersCredits)
    }
  }




  const subscriptionCanceled = async (stripeEvent) => {
    console.log('Subscription Canceled')

    const stripeCustomerId = stripeEvent.customer
    console.log('stripeCustomerId', stripeCustomerId)

    const setCancelStatus = await handleSetCanceledSubsciptionStatus(stripeCustomerId)
    console.log('setCancelStatus', setCancelStatus)
  }






  /* ------------------------------ Switch Board ------------------------------ */

  // This validates the stripe event and sets stripeEvent to the event object from Stripe.
  const stripeEvent = stripe.webhooks.constructEvent(event.body, event.headers['Stripe-Signature'], stripeWebhookSecret);

  // Extract the type of the event from the Stripe data
  const eventType = stripeEvent.type;

  switch (eventType) {
    case 'charge.failed':
      // Handle a failed payment
      await subscriptionPaymentFailed(stripeEvent.data.object);
      break;
    case 'invoice.payment_succeeded':
      // Handle a successful subscription renewal payment
      await subscriptionRenewelPaymentComplete(stripeEvent.data.object);
      break;
    case 'customer.subscription.deleted':
      // Handle a subscription cancellation
      await subscriptionCanceled(stripeEvent.data.object);
      break;
    default:
      console.log('Unhandled event type:', eventType);
  }




  /* --------------------------------- Return --------------------------------- */

  return {
    statusCode: 200,
    //  Uncomment below to enable CORS requests
    //  headers: {
    //      "Access-Control-Allow-Origin": "*",
    //      "Access-Control-Allow-Headers": "*"
    //  }, 
    body: JSON.stringify('Hook Finished'),
  };
};
