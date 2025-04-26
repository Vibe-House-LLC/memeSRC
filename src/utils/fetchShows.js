import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { listFavorites } from '../graphql/queries';

const client = generateClient();

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
    const currentUser = await getCurrentUser();
    return `showsCache-${currentUser.username}-${APP_VERSION}`;
  } catch {
    return `showsCache-${APP_VERSION}`;
  }
}

async function fetchShowsFromAPI() {
  try {
    const aliases = await client.graphql({
      query: listAliasesQuery,
      variables: { filter: {}, limit: 250 },
      authMode: 'apiKey',
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
  } catch (error) {
    console.error('Error fetching shows from API:', error);
    return [];
  }
}

async function fetchFavorites() {
  try {
    const currentUser = await getCurrentUser();

    let nextToken = null;
    let allFavorites = [];

    do {
      // Disable ESLint check for await-in-loop
      // eslint-disable-next-line no-await-in-loop
      const result = await client.graphql({
        query: listFavorites,

        variables: {
          limit: 10,
          nextToken,
        },

        authMode: 'awsIam'
      });

      allFavorites = allFavorites.concat(result.data.listFavorites.items);
      nextToken = result.data.listFavorites.nextToken;

    } while (nextToken);

    return allFavorites;
  } catch (error) {
    // User is not authenticated or other error
    return [];
  }
}

async function updateCacheAndReturnData(data, cacheKey) {
  try {
    const currentUser = await getCurrentUser();
    const favorites = await fetchFavorites();
    const favoriteShowIds = new Set(favorites.map(favorite => favorite.cid));

    data = data.map(show => ({
      ...show,
      isFavorite: favoriteShowIds.has(show.id)
    }));
  } catch (error) {
    // If there's an error fetching favorites (likely due to not being authenticated), return data without favorites.
  }

  try {
    const cacheData = {
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }

  return data;
}

export default async function fetchShows() {
  try {
    const CACHE_KEY = await getCacheKey();
    let cachedData = null;
    
    try {
      cachedData = localStorage.getItem(CACHE_KEY);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }

    async function refreshDataInBackground() {
      try {
        const freshData = await fetchShowsFromAPI();
        updateCacheAndReturnData(freshData, CACHE_KEY);
      } catch (error) {
        console.error('Error refreshing data in background:', error);
      }
    }

    if (cachedData) {
      try {
        const { data, updatedAt } = JSON.parse(cachedData);
        const cacheAge = (Date.now() - updatedAt) / 1000 / 60;

        if (cacheAge <= CACHE_EXPIRATION_MINUTES) {
          return data; // Data is fresh enough, return it directly
        }
        // Data is stale, kick off a background update
        refreshDataInBackground();
        return data; // Return the stale data for immediate use
      } catch (error) {
        console.error('Error parsing cached data:', error);
      }
    }

    // No cache found or error with cache, fetch new data and return after updating cache
    const freshData = await fetchShowsFromAPI();
    return updateCacheAndReturnData(freshData, CACHE_KEY);
  } catch (error) {
    console.error('Unhandled error in fetchShows:', error);
    // As a last resort, try to fetch shows directly and return them
    try {
      return await fetchShowsFromAPI();
    } catch (finalError) {
      console.error('Fatal error in fetchShows:', finalError);
      return []; // Return empty array to prevent UI from breaking
    }
  }
}
