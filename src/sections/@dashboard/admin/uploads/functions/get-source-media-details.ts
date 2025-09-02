import { API, graphqlOperation } from "aws-amplify";
import { GetSourceMediaApiResponse } from "../types";

const getSourceMediaDetailsQuery = /* GraphQL */ `
  query GetSourceMedia($id: ID!) {
    getSourceMedia(id: $id) {
      id
      series {
        id
        tvdbid
        slug
        name
        year
        image
        description
        statusText
        createdAt
        updatedAt
        __typename
      }
      files {
        items {
          id
        key
        status
        createdAt
        updatedAt
        sourceMediaFilesId
        }
        nextToken
        __typename
      }
      status
      user {
        id
        username
        email
        earlyAccessStatus
        contributorAccessStatus
        stripeId
        status
        credits
        subscriptionPeriodStart
        subscriptionPeriodEnd
        subscriptionStatus
        magicSubscription
        createdAt
        updatedAt
        userDetailsStripeCustomerInfoId
        __typename
      }
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
      pendingAlias
      __typename
    }
  }
`;

export default async function getSourceMediaDetails(id: string) {
    const response = await API.graphql<GetSourceMediaApiResponse>(
        graphqlOperation(
            getSourceMediaDetailsQuery,
            { id }
        )
    ) as GetSourceMediaApiResponse;
    
    return response.data.getSourceMedia;
}