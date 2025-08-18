import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { env } from "$amplify/env/post-confirmation";
import { createProfile } from "./graphql/mutations";
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.REACT_APP_STRIPE_SECRET_KEY!);

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: "iam",
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  }
);

const client = generateClient<Schema>({
  authMode: "iam",
});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Check if this is a new user confirmation
  const isNewUser = event.triggerSource === 'PostConfirmation_ConfirmSignUp';

  try {
    if (isNewUser) {
      console.log('Processing new user confirmation');

      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: event.request.userAttributes.email,
        name: `${event.request.userAttributes.given_name} ${event.request.userAttributes.family_name}`,
      });

      // Create the profile with the new Stripe customer ID
      await client.graphql({
        query: createProfile,
        variables: {
          input: {
            id: event.request.userAttributes.sub,
            firstName: event.request.userAttributes.given_name,
            lastName: event.request.userAttributes.family_name,
            email: event.request.userAttributes.email,
            stripeCustomerId: customer.id,
            owner: event.request.userAttributes.sub,
          },
        },
      });

      console.log('Profile created successfully');
    } else {
      console.log('This is not a new user confirmation. No action taken.');
    }

    return event;
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    throw error;
  }
};
