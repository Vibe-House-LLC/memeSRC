// ShowContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { listFavorites } from '../graphql/queries';
import { UserContext } from '../UserContext';

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

export const ShowContext = createContext();

export const ShowProvider = ({ children }) => {
    const [shows, setShows] = useState([]);
    const { user } = useContext(UserContext)

    useEffect(() => {
        fetchShows();
        // console.log('loading')
    }, [user]);

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
        let nextToken = null;
        let allFavorites = [];

        do {
            // Disable ESLint check for await-in-loop
            // eslint-disable-next-line no-await-in-loop
            const result = await API.graphql(graphqlOperation(listFavorites, {
                limit: 10,
                nextToken,
            }));

            allFavorites = allFavorites.concat(result.data.listFavorites.items);
            // eslint-disable-next-line prefer-destructuring
            nextToken = result.data.listFavorites.nextToken;

        } while (nextToken);

        return allFavorites;
    }

    async function updateCacheAndReturnData(data, cacheKey) {
        try {
            await Auth.currentAuthenticatedUser();
            const favorites = await fetchFavorites()
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

    async function fetchShows() {
        const CACHE_KEY = await getCacheKey();
        const cachedData = localStorage.getItem(CACHE_KEY);

        async function refreshDataAndUpdateCache() {
            const freshData = await fetchShowsFromAPI();
            const updatedData = await updateCacheAndReturnData(freshData, CACHE_KEY);
            setShows(updatedData);
        }
        
        if (cachedData) {
            setShows(JSON.parse(cachedData).data);
            // console.log(JSON.parse(cachedData).data)
        }

        await refreshDataAndUpdateCache();

        // if (currentUser) {
        //     // If user exists, fetch fresh data and update the cache
            
        //     await refreshDataAndUpdateCache();
        // } else if (cachedData) {

        //     refreshDataAndUpdateCache();
        // } else {
        //     // If user doesn't exist and there is no cached data, fetch fresh data and update the cache
        //     await refreshDataAndUpdateCache();
        // }
    }

    return (
        <ShowContext.Provider value={{ shows }}>
            {children}
        </ShowContext.Provider>
    );
};

ShowProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useShows = () => {
    const context = React.useContext(ShowContext);
    if (context === undefined) {
        throw new Error('useShows must be used within a ShowProvider');
    }
    return context;
};