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
      Names: ["stripeKey","stripeWebhookSecret"].map(secretName => process.env[secretName]),
      WithDecryption: true,
    })
    .promise();
  const stripeKey = Parameters.find(param => param.Name === process.env['stripeKey']).Value;
  const stripeWebhookSecret = Parameters.find(param => param.Name === process.env['stripeWebhookSecret']).Value;

  const stripe = require('stripe')(stripeKey);

  /* --------------------------- Possible Scenarios --------------------------- */

  const subscriptionPaymentFailed = async () => {
    console.log('Subscription Payment Failed')
  }

  const subscriptionRenewelPaymentComplete = async () => {
    console.log('Subscription Renewel Payment Complete')
  }

  const subscriptionCanceled = async () => {
    console.log('Subscription Canceled')
  }

  const stripeEvent = stripe.webhooks.constructEvent(event.body, event.headers['Stripe-Signature'], stripeWebhookSecret);

  // Extract the type of the event from the Stripe data
  const eventType = stripeEvent.type;

  switch (eventType) {
    case 'charge.failed':
      // Handle a failed payment
      await subscriptionPaymentFailed();
      break;
    case 'invoice.payment_succeeded':
      // Handle a successful subscription renewal payment
      await subscriptionRenewelPaymentComplete();
      break;
    case 'customer.subscription.deleted':
      // Handle a subscription cancellation
      await subscriptionCanceled();
      break;
    default:
      console.log('Unhandled event type:', eventType);
  }

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
