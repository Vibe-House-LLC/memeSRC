/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type Profile = {
  __typename: "Profile",
  createdAt: string,
  email?: string | null,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  owner?: string | null,
  stripeCustomerId?: string | null,
  updatedAt: string,
};

export type ModelProfileFilterInput = {
  and?: Array< ModelProfileFilterInput | null > | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  id?: ModelIDInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelProfileFilterInput | null,
  or?: Array< ModelProfileFilterInput | null > | null,
  owner?: ModelStringInput | null,
  stripeCustomerId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelStringInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export enum ModelAttributeTypes {
  _null = "_null",
  binary = "binary",
  binarySet = "binarySet",
  bool = "bool",
  list = "list",
  map = "map",
  number = "number",
  numberSet = "numberSet",
  string = "string",
  stringSet = "stringSet",
}


export type ModelSizeInput = {
  between?: Array< number | null > | null,
  eq?: number | null,
  ge?: number | null,
  gt?: number | null,
  le?: number | null,
  lt?: number | null,
  ne?: number | null,
};

export type ModelIDInput = {
  attributeExists?: boolean | null,
  attributeType?: ModelAttributeTypes | null,
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  size?: ModelSizeInput | null,
};

export type ModelProfileConnection = {
  __typename: "ModelProfileConnection",
  items:  Array<Profile | null >,
  nextToken?: string | null,
};

export type ModelProfileConditionInput = {
  and?: Array< ModelProfileConditionInput | null > | null,
  createdAt?: ModelStringInput | null,
  email?: ModelStringInput | null,
  firstName?: ModelStringInput | null,
  lastName?: ModelStringInput | null,
  not?: ModelProfileConditionInput | null,
  or?: Array< ModelProfileConditionInput | null > | null,
  owner?: ModelStringInput | null,
  stripeCustomerId?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type CreateProfileInput = {
  email?: string | null,
  firstName?: string | null,
  id?: string | null,
  lastName?: string | null,
  owner?: string | null,
  stripeCustomerId?: string | null,
};

export type DeleteProfileInput = {
  id: string,
};

export type UpdateProfileInput = {
  email?: string | null,
  firstName?: string | null,
  id: string,
  lastName?: string | null,
  owner?: string | null,
  stripeCustomerId?: string | null,
};

export type ModelSubscriptionProfileFilterInput = {
  and?: Array< ModelSubscriptionProfileFilterInput | null > | null,
  createdAt?: ModelSubscriptionStringInput | null,
  email?: ModelSubscriptionStringInput | null,
  firstName?: ModelSubscriptionStringInput | null,
  id?: ModelSubscriptionIDInput | null,
  lastName?: ModelSubscriptionStringInput | null,
  or?: Array< ModelSubscriptionProfileFilterInput | null > | null,
  owner?: ModelStringInput | null,
  stripeCustomerId?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
};

export type ModelSubscriptionStringInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionIDInput = {
  beginsWith?: string | null,
  between?: Array< string | null > | null,
  contains?: string | null,
  eq?: string | null,
  ge?: string | null,
  gt?: string | null,
  in?: Array< string | null > | null,
  le?: string | null,
  lt?: string | null,
  ne?: string | null,
  notContains?: string | null,
  notIn?: Array< string | null > | null,
};

export type GetProfileQueryVariables = {
  id: string,
};

export type GetProfileQuery = {
  getProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type ListProfilesQueryVariables = {
  filter?: ModelProfileFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type ListProfilesQuery = {
  listProfiles?:  {
    __typename: "ModelProfileConnection",
    items:  Array< {
      __typename: "Profile",
      createdAt: string,
      email?: string | null,
      firstName?: string | null,
      id: string,
      lastName?: string | null,
      owner?: string | null,
      stripeCustomerId?: string | null,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type CreateProfileMutationVariables = {
  condition?: ModelProfileConditionInput | null,
  input: CreateProfileInput,
};

export type CreateProfileMutation = {
  createProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type DeleteProfileMutationVariables = {
  condition?: ModelProfileConditionInput | null,
  input: DeleteProfileInput,
};

export type DeleteProfileMutation = {
  deleteProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type UpdateProfileMutationVariables = {
  condition?: ModelProfileConditionInput | null,
  input: UpdateProfileInput,
};

export type UpdateProfileMutation = {
  updateProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnCreateProfileSubscriptionVariables = {
  filter?: ModelSubscriptionProfileFilterInput | null,
  owner?: string | null,
};

export type OnCreateProfileSubscription = {
  onCreateProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnDeleteProfileSubscriptionVariables = {
  filter?: ModelSubscriptionProfileFilterInput | null,
  owner?: string | null,
};

export type OnDeleteProfileSubscription = {
  onDeleteProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};

export type OnUpdateProfileSubscriptionVariables = {
  filter?: ModelSubscriptionProfileFilterInput | null,
  owner?: string | null,
};

export type OnUpdateProfileSubscription = {
  onUpdateProfile?:  {
    __typename: "Profile",
    createdAt: string,
    email?: string | null,
    firstName?: string | null,
    id: string,
    lastName?: string | null,
    owner?: string | null,
    stripeCustomerId?: string | null,
    updatedAt: string,
  } | null,
};
