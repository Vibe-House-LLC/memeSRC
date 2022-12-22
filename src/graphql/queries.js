/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getGlobalMessage = /* GraphQL */ `
  query GetGlobalMessage($id: ID!) {
    getGlobalMessage(id: $id) {
      id
      title
      message
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
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
export const getContentMetadata = /* GraphQL */ `
  query GetContentMetadata($id: ID!) {
    getContentMetadata(id: $id) {
      id
      title
      description
      frameCount
      colorMain
      colorSecondary
      emoji
      status
      createdAt
      updatedAt
    }
  }
`;
export const listContentMetadata = /* GraphQL */ `
  query ListContentMetadata(
    $filter: ModelContentMetadataFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listContentMetadata(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        title
        description
        frameCount
        colorMain
        colorSecondary
        emoji
        status
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
