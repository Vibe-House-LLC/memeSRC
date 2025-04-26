import { generateClient, graphqlOperation } from 'aws-amplify/api';
import { getCurrentUser, Auth } from 'aws-amplify/auth';
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

async function fetchShows() {
    try {
        const aliases = await client.graphql({
            query: listAliasesQuery,
            variables: { filter: {}, limit: 250 },
            authMode: 'apiKey'
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
        console.error('Error fetching shows:', error);
        return [];
    }
}

async function fetchFavorites() {
    try {
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
        console.error('Error fetching favorites:', error);
        return [];
    }
}

async function getShowsWithFavorites(favorites = []) {
    try {
        const shows = await fetchShows();
        
        try {
            await getCurrentUser();
            // const favorites = await fetchFavorites();
            // const favoriteShowIds = new Set(favorites.map(favorite => favorite.cid));

            const showsWithFavorites = shows.map(show => ({
                ...show,
                isFavorite: favorites.includes(show.id)
            }));

            return showsWithFavorites;
        } catch (error) {
            // If there's an error fetching favorites (likely due to not being authenticated), return shows without favorites.
            return shows;
        }
    } catch (error) {
        console.error('Error in getShowsWithFavorites:', error);
        return [];
    }
}

export { getShowsWithFavorites };