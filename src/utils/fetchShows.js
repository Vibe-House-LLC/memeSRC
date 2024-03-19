import { API, graphqlOperation } from "aws-amplify";
import { listAliases } from "../graphql/queries";

const listAliasesQuery = /* GraphQL */ `
  query ListAliases(
    $filter: ModelAliasFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listAliases(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        createdAt
        updatedAt
        aliasV2ContentMetadataId
        v2ContentMetadata {
          colorMain
          colorSecondary
          createdAt
          description
          emoji
          frameCount
          title
          updatedAt
          status
          id
          version
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export default async function fetchShows() {
  const aliases = await API.graphql({
    ...graphqlOperation(listAliasesQuery, { filter: {}, limit: 50 }),
    authMode: 'API_KEY',
  });

  const loadedV2Shows = aliases?.data?.listAliases?.items.filter(obj => obj?.v2ContentMetadata) || [];

  // Map the loaded V2 shows to the desired format
  const finalShows = loadedV2Shows.map(v2Show => ({
    ...v2Show.v2ContentMetadata,
    id: v2Show.id,
    cid: v2Show.v2ContentMetadata.id
  }));

  // Sort the final list of shows by title
  const sortedMetadata = finalShows.sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });

  return sortedMetadata;
}
