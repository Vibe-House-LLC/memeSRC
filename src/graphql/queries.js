/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getAnalyticsMetrics = /* GraphQL */ `
  query GetAnalyticsMetrics($id: ID!) {
    getAnalyticsMetrics(id: $id) {
      id
      value
      createdAt
      updatedAt
    }
  }
`;
export const listAnalyticsMetrics = /* GraphQL */ `
  query ListAnalyticsMetrics(
    $filter: ModelAnalyticsMetricsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAnalyticsMetrics(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        value
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
export const getHomepageSection = /* GraphQL */ `
  query GetHomepageSection($id: ID!) {
    getHomepageSection(id: $id) {
      id
      index
      title
      subtitle
      buttons
      bottomImage
      buttonSubtext
      backgroundColor
      textColor
      createdAt
      updatedAt
    }
  }
`;
export const listHomepageSections = /* GraphQL */ `
  query ListHomepageSections(
    $filter: ModelHomepageSectionFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHomepageSections(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        index
        title
        subtitle
        buttons
        bottomImage
        buttonSubtext
        backgroundColor
        textColor
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
