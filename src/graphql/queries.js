/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getGlobalMessage = /* GraphQL */ `
  query GetGlobalMessage($id: ID!) {
    getGlobalMessage(id: $id) {
      id
      title
      message
      timestamp
      createdAt
      updatedAt
    }
  }
`;
export const listGlobalMessages = /* GraphQL */ `
  query ListGlobalMessages(
    $filter: ModelGlobalMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listGlobalMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        message
        timestamp
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
