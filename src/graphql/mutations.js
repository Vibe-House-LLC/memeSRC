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
      timestamp
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
      timestamp
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
      timestamp
      createdAt
      updatedAt
    }
  }
`;
