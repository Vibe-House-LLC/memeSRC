import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { postConfirmation } from "../auth/post-confirmation/resource";

const schema = a.schema({
  Profile: a
    .model({
      firstName: a.string()
        .authorization((allow) => [
          allow.guest().to(['read']),
          allow.authenticated().to(['read']),
          allow.group("ADMINS"),
          allow.ownerDefinedIn("owner")
        ]),
      lastName: a.string(),
      email: a.email(),
      stripeCustomerId: a.string(),
      owner: a.string(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("owner"),
      allow.group("ADMINS"),
    ]),
})
.authorization((allow) => [allow.resource(postConfirmation)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
