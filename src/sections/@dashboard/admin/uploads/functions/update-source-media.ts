import { API, graphqlOperation } from "aws-amplify";
import { UpdateSourceMediaApiResponse } from "../types";

const updateSourceMediaMutation = /* GraphQL */ `
  mutation UpdateSourceMedia(
    $input: UpdateSourceMediaInput!
    $condition: ModelSourceMediaConditionInput
  ) {
    updateSourceMedia(input: $input, condition: $condition) {
      id
      status
      pendingAlias
      createdAt
      updatedAt
      userDetailsSourceMediaId
      sourceMediaSeriesId
      __typename
    }
  }
`;

export default async function updateSourceMedia(id: string, data: any) {
    const response = await API.graphql<UpdateSourceMediaApiResponse>(
        graphqlOperation(
            updateSourceMediaMutation,
            { input: { id, ...data } }
        )
    ) as UpdateSourceMediaApiResponse;

    return response.data.updateSourceMedia;
}