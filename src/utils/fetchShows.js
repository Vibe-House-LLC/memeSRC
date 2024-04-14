// fetchShows.js

import { API, graphqlOperation, Auth } from "aws-amplify";
import { listFavorites } from '../graphql/queries';

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

const CACHE_KEY = 'showsCache';
const CACHE_EXPIRATION_MINUTES = 5;

async function fetchShowsFromAPI() {
  const aliases = await API.graphql({
    query: listAliasesQuery,
    variables: { filter: {}, limit: 50 },
    authMode: 'API_KEY',
  });

  const loadedV2Shows = aliases?.data?.listAliases?.items.filter(obj => obj?.v2ContentMetadata) || [];

  // Map the loaded V2 shows to the desired format
  const finalShows = loadedV2Shows.map(v2Show => ({
    ...v2Show.v2ContentMetadata,
    id: v2Show.id,
    cid: v2Show.v2ContentMetadata.id
  }));

  // Sort the final list of shows by title, ignoring "The" at the beginning
  const sortedMetadata = finalShows.sort((a, b) => {
    const titleA = a.title.toLowerCase().replace(/^the\s+/, '');
    const titleB = b.title.toLowerCase().replace(/^the\s+/, '');
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
  });

  return sortedMetadata;
}

async function fetchFavorites() {
  const currentUser = await Auth.currentAuthenticatedUser();

  let nextToken = null;
  let allFavorites = [];

  do {
    // eslint-disable-next-line no-await-in-loop
    const result = await API.graphql(graphqlOperation(listFavorites, {
      limit: 10,
      nextToken,
    }));

    allFavorites = allFavorites.concat(result.data.listFavorites.items);
    nextToken = result.data.listFavorites.nextToken;

  } while (nextToken);

  return allFavorites;
}

export default async function fetchShows() {
  const cachedData = localStorage.getItem(CACHE_KEY);

  if (cachedData) {
    const { data, updatedAt } = JSON.parse(cachedData);
    const cacheAge = (Date.now() - updatedAt) / 1000 / 60; // Cache age in minutes

    if (cacheAge <= CACHE_EXPIRATION_MINUTES) {
      // Cache is valid, return the cached data
      return data;
    }

    // Cache is expired, fetch new data in the background and update the cache
    fetchShowsFromAPI().then((freshData) => {
      const cacheData = {
        data: freshData,
        updatedAt: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    });

    // Return the cached data for now
    return data;
  }

  // Cache doesn't exist, fetch new data and store it in the cache
  const freshData = await fetchShowsFromAPI();

  // Fetch user's favorites
  const favorites = await fetchFavorites();

  // Create a Set of favorite show IDs for efficient lookup
  const favoriteShowIds = new Set(favorites.map(favorite => favorite.cid));

  // Add a new property 'isFavorite' to each show object
  const updatedData = freshData.map(show => ({
    ...show,
    isFavorite: favoriteShowIds.has(show.id)
  }));

  const cacheData = {
    data: updatedData,
    updatedAt: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

  return updatedData;
}
