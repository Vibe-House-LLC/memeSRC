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

async function fetchShows(): Promise<any[]> {
  const aliases: any = (await API.graphql({
    query: listAliasesQuery,
    variables: { filter: {}, limit: 250 },
    authMode: 'API_KEY',
  }) as any);

  const loadedV2Shows: any[] = aliases?.data?.listAliases?.items?.filter((obj: any) => obj?.v2ContentMetadata) || [];

  const finalShows = loadedV2Shows.map((v2Show: any) => ({
    ...v2Show.v2ContentMetadata,
    id: v2Show.id,
    cid: v2Show.v2ContentMetadata.id,
  }));

  const sortedMetadata = finalShows.sort((a: any, b: any) => {
    const titleA = String(a.title).toLowerCase().replace(/^the\s+/, '');
    const titleB = String(b.title).toLowerCase().replace(/^the\s+/, '');
    return titleA.localeCompare(titleB);
  });

  return sortedMetadata;
}

async function getShowsWithFavorites(favorites: string[] = []): Promise<any[]> {
  const shows = await fetchShows();

  try {
    await Auth.currentAuthenticatedUser();

    const showsWithFavorites = shows.map((show: any) => ({
      ...show,
      isFavorite: favorites.includes(show.id),
    }));

    return showsWithFavorites;
  } catch (_error) {
    // Not authenticated or other error: return shows without favorites flag.
    return shows;
  }
}

export { getShowsWithFavorites };

