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
  
    const loadedV1Shows = result?.data?.contentMetadataByStatus?.items || []
    const loadedV2Shows = aliases?.data?.listAliases?.items || []
  
    const combinedShows = loadedV1Shows?.map(v1Show => {
      const foundReplacement = loadedV2Shows.find(obj => obj.id === v1Show.id)
  
      if (foundReplacement) {
        return { ...foundReplacement?.v2ContentMetadata, id: foundReplacement.id, cid: foundReplacement?.v2ContentMetadata?.id }
      }
      
      return v1Show
    });
  
    console.log(combinedShows)
  
    const sortedMetadata = combinedShows.sort((a, b) => {
      if (a.title < b.title) return -1;
      if (a.title > b.title) return 1;
      return 0;
    });
    return sortedMetadata;
  }