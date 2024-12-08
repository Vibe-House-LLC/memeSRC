import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation',
  environment: {
    REACT_APP_STRIPE_SECRET_KEY: process.env.REACT_APP_STRIPE_SECRET_KEY!
  }
});
