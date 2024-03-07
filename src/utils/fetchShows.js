import { API, graphqlOperation } from "aws-amplify";
import { contentMetadataByStatus } from "../graphql/queries";

const listAliases = /* GraphQL */ `
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
  const result = await API.graphql({
    ...graphqlOperation(contentMetadataByStatus, { filter: {}, limit: 50, status: 1 }),
    authMode: 'API_KEY',
  });
  const aliases = await API.graphql({
    ...graphqlOperation(listAliases, { filter: {}, limit: 50 }),
    authMode: 'API_KEY',
  });

  const loadedV1Shows = result?.data?.contentMetadataByStatus?.items || [];
  let loadedV2Shows = aliases?.data?.listAliases?.items.filter(obj => obj?.v2ContentMetadata) || [];

  const usedV2ShowIds = [];

  const combinedShows = loadedV1Shows.map(v1Show => {
    const foundIndex = loadedV2Shows.findIndex(obj => obj.id === v1Show.id);
    if (foundIndex > -1) {
      const foundReplacement = loadedV2Shows[foundIndex];
      usedV2ShowIds.push(foundReplacement.id);
      return { ...foundReplacement.v2ContentMetadata, id: foundReplacement.id, cid: foundReplacement.v2ContentMetadata.id };
    }
    return v1Show;
  });

  // Remove used V2 shows from the loadedV2Shows array
  loadedV2Shows = loadedV2Shows.filter(obj => !usedV2ShowIds.includes(obj.id));

  // Combine the remaining V2 shows with the combinedShows
  const finalShows = [...combinedShows, ...loadedV2Shows.map(v2Show => ({
    ...v2Show.v2ContentMetadata,
    id: v2Show.id,
    cid: v2Show.v2ContentMetadata.id
  }))];

  // Sort the final list of shows by title
  const sortedMetadata = finalShows.sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return 0;
  });

  return sortedMetadata;
}