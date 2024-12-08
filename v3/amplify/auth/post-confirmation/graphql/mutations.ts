/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "./API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createProfile = /* GraphQL */ `mutation CreateProfile(
  $condition: ModelProfileConditionInput
  $input: CreateProfileInput!
) {
  createProfile(condition: $condition, input: $input) {
    createdAt
    email
    firstName
    id
    lastName
    owner
    stripeCustomerId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.CreateProfileMutationVariables,
  APITypes.CreateProfileMutation
>;
export const deleteProfile = /* GraphQL */ `mutation DeleteProfile(
  $condition: ModelProfileConditionInput
  $input: DeleteProfileInput!
) {
  deleteProfile(condition: $condition, input: $input) {
    createdAt
    email
    firstName
    id
    lastName
    owner
    stripeCustomerId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.DeleteProfileMutationVariables,
  APITypes.DeleteProfileMutation
>;
export const updateProfile = /* GraphQL */ `mutation UpdateProfile(
  $condition: ModelProfileConditionInput
  $input: UpdateProfileInput!
) {
  updateProfile(condition: $condition, input: $input) {
    createdAt
    email
    firstName
    id
    lastName
    owner
    stripeCustomerId
    updatedAt
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateProfileMutationVariables,
  APITypes.UpdateProfileMutation
>;
