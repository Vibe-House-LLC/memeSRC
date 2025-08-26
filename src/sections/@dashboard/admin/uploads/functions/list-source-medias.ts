import { API, graphqlOperation } from "aws-amplify";
import { SourceMediaApiResponse } from "../types";

const listSourceMediasQuery = /* GraphQL */ `
  query ListSourceMedias(
    $filter: ModelSourceMediaFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSourceMedias(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        status
        createdAt
        updatedAt
        userDetailsSourceMediaId
        sourceMediaSeriesId
        user {
          id
          username
        }
        series {
          name
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

const listAllSourceMedias = async (nextToken: string | null = null) => {
    const response = await API.graphql<SourceMediaApiResponse>(
        graphqlOperation(
            listSourceMediasQuery,
            {
                nextToken
            }
        )
    ) as SourceMediaApiResponse;
    
    if (response?.data?.listSourceMedias) {
        return response.data.listSourceMedias;
    }
    return null;
}

export default async function listSourceMedias() {
    const sourceMedias = [];
    let nextToken: string | null = null;
    do {
        // eslint-disable-next-line no-await-in-loop
        const response = await listAllSourceMedias(nextToken);
        if (response) {
            const { items, nextToken: newNextToken } = response;
            sourceMedias.push(...items);
            nextToken = newNextToken;
        }
    } while (nextToken);
    
    if (sourceMedias) {
        return sourceMedias;
    }
    return null;
}