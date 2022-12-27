/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createGlobalMessage = /* GraphQL */ `
  mutation CreateGlobalMessage(
    $input: CreateGlobalMessageInput!
    $condition: ModelGlobalMessageConditionInput
  ) {
    createGlobalMessage(input: $input, condition: $condition) {
      id
      title
      message
      createdAt
      updatedAt
    }
  }
`;
export const updateGlobalMessage = /* GraphQL */ `
  mutation UpdateGlobalMessage(
    $input: UpdateGlobalMessageInput!
    $condition: ModelGlobalMessageConditionInput
  ) {
    updateGlobalMessage(input: $input, condition: $condition) {
      id
      title
      message
      createdAt
      updatedAt
    }
  }
`;
export const deleteGlobalMessage = /* GraphQL */ `
  mutation DeleteGlobalMessage(
    $input: DeleteGlobalMessageInput!
    $condition: ModelGlobalMessageConditionInput
  ) {
    deleteGlobalMessage(input: $input, condition: $condition) {
      id
      title
      message
      createdAt
      updatedAt
    }
  }
`;
export const createContentMetadata = /* GraphQL */ `
  mutation CreateContentMetadata(
    $input: CreateContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    createContentMetadata(input: $input, condition: $condition) {
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
export const updateContentMetadata = /* GraphQL */ `
  mutation UpdateContentMetadata(
    $input: UpdateContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    updateContentMetadata(input: $input, condition: $condition) {
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
export const deleteContentMetadata = /* GraphQL */ `
  mutation DeleteContentMetadata(
    $input: DeleteContentMetadataInput!
    $condition: ModelContentMetadataConditionInput
  ) {
    deleteContentMetadata(input: $input, condition: $condition) {
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
export const createHomepageSection = /* GraphQL */ `
  mutation CreateHomepageSection(
    $input: CreateHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    createHomepageSection(input: $input, condition: $condition) {
      id
      index
      title
      subtitle
      buttons
      bottomImage
      buttonSubtext
      createdAt
      updatedAt
    }
  }
`;
export const updateHomepageSection = /* GraphQL */ `
  mutation UpdateHomepageSection(
    $input: UpdateHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    updateHomepageSection(input: $input, condition: $condition) {
      id
      index
      title
      subtitle
      buttons
      bottomImage
      buttonSubtext
      createdAt
      updatedAt
    }
  }
`;
export const deleteHomepageSection = /* GraphQL */ `
  mutation DeleteHomepageSection(
    $input: DeleteHomepageSectionInput!
    $condition: ModelHomepageSectionConditionInput
  ) {
    deleteHomepageSection(input: $input, condition: $condition) {
      id
      index
      title
      subtitle
      buttons
      bottomImage
      buttonSubtext
      createdAt
      updatedAt
    }
  }
`;
