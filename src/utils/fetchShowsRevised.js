import { API, Auth } from 'aws-amplify';

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


async function getShowsWithFavorites(favorites = []) {
    const shows = await fetchShows();
    
    try {
        await Auth.currentAuthenticatedUser();
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
}

export { getShowsWithFavorites };