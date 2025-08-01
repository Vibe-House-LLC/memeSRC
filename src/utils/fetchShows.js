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

const APP_VERSION = process.env.REACT_APP_VERSION || 'defaultVersion';
const CACHE_EXPIRATION_MINUTES = 1; // Define cache expiration minutes

async function getCacheKey() {
  try {
    const currentUser = await Auth.currentAuthenticatedUser();
    return `showsCache-${currentUser.username}-${APP_VERSION}`;
  } catch {
    return `showsCache-${APP_VERSION}`;
  }
}

async function fetchShowsFromAPI() {
  const aliases = await API.graphql({
    query: listAliasesQuery,
    variables: { filter: {}, limit: 250 },
    authMode: 'API_KEY',
  });

  const loadedV2Shows = aliases?.data?.listAliases?.items.filter(obj => obj?.v2ContentMetadata) || [];

  const finalShows = loadedV2Shows.map(v2Show => ({
    ...v2Show.v2ContentMetadata,
    id: v2Show.id,
    cid: v2Show.v2ContentMetadata.id
  }));

  const sortedMetadata = finalShows.sort((a, b) => {
    const titleA = a.title.toLowerCase().replace(/^the\s+/, '');
    const titleB = b.title.toLowerCase().replace(/^the\s+/, '');
    return titleA.localeCompare(titleB);
  });

  return sortedMetadata;
}

async function fetchFavorites() {
  await Auth.currentAuthenticatedUser();

  let nextToken = null;
  let allFavorites = [];

  do {
    // Disable ESLint check for await-in-loop
    // eslint-disable-next-line no-await-in-loop
    const result = await API.graphql(graphqlOperation(listFavorites, {
      limit: 10,
      nextToken,
    }));

    const { items, nextToken: newNextToken } = result.data.listFavorites;
    allFavorites = allFavorites.concat(items);
    nextToken = newNextToken;

  } while (nextToken);

  return allFavorites;
}

async function updateCacheAndReturnData(data, cacheKey) {
  try {
    await Auth.currentAuthenticatedUser();
    const favorites = await fetchFavorites();
    const favoriteShowIds = new Set(favorites.map(favorite => favorite.cid));

    data = data.map(show => ({
      ...show,
      isFavorite: favoriteShowIds.has(show.id)
    }));
  } catch (error) {
    // If there's an error fetching favorites (likely due to not being authenticated), return data without favorites.
  }

  const cacheData = {
    data,
    updatedAt: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));

  return data;
}

export default async function fetchShows() {
  const CACHE_KEY = await getCacheKey();
  const cachedData = localStorage.getItem(CACHE_KEY);

  async function refreshDataInBackground() {
    const freshData = await fetchShowsFromAPI();
    updateCacheAndReturnData(freshData, CACHE_KEY);
  }

  if (cachedData) {
    const { data, updatedAt } = JSON.parse(cachedData);
    const cacheAge = (Date.now() - updatedAt) / 1000 / 60;

    if (cacheAge <= CACHE_EXPIRATION_MINUTES) {
      return data; // Data is fresh enough, return it directly
    }
    // Data is stale, kick off a background update
    refreshDataInBackground();
    return data; // Return the stale data for immediate use
  }

  // No cache found, fetch new data and return after updating cache
  const freshData = await fetchShowsFromAPI();
  return updateCacheAndReturnData(freshData, CACHE_KEY);
}
