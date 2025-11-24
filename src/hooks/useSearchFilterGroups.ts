import { useState, useEffect, useCallback, useContext } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { searchFilterGroupsByOwner } from '../graphql/queries';
import { UserContext } from '../UserContext';

// Define types locally until codegen runs
export interface SearchFilterGroup {
    id: string;
    name: string;
    filters: string; // AWSJSON is string
    createdAt: string;
    updatedAt: string;
    owner?: string;
}

interface SearchFilterGroupsByOwnerResponse {
    searchFilterGroupsByOwner: {
        items: SearchFilterGroup[];
        nextToken: string | null;
    };
}

const pickFirstString = (...values: Array<unknown>): string | null => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return null;
};

const buildOwnerIdentifier = (user: any): string | null => {
    if (!user) {
        return null;
    }

    const sessionPayload =
        user?.signInUserSession?.idToken?.payload ??
        user?.signInUserSession?.accessToken?.payload ??
        null;

    const sub = pickFirstString(
        sessionPayload?.sub,
        user?.sub,
        user?.attributes?.sub,
        user?.userDetails?.sub
    );

    const username = pickFirstString(
        sessionPayload?.['cognito:username'],
        user?.['cognito:username'],
        user?.username,
        user?.userDetails?.username,
        sessionPayload?.preferred_username,
        sessionPayload?.username,
        user?.attributes?.preferred_username,
        sessionPayload?.email,
        user?.attributes?.email,
        user?.email,
        user?.userDetails?.email
    );

    if (!sub || !username) {
        return null;
    }

    return `${sub}::${username}`;
};

// GraphQL Operations (Inline to avoid dependency on un-generated files)

const createSearchFilterGroup = /* GraphQL */ `
  mutation CreateSearchFilterGroup(
    $input: CreateSearchFilterGroupInput!
    $condition: ModelSearchFilterGroupConditionInput
  ) {
    createSearchFilterGroup(input: $input, condition: $condition) {
      id
      name
      filters
      createdAt
      updatedAt
      owner
    }
  }
`;

const updateSearchFilterGroup = /* GraphQL */ `
  mutation UpdateSearchFilterGroup(
    $input: UpdateSearchFilterGroupInput!
    $condition: ModelSearchFilterGroupConditionInput
  ) {
    updateSearchFilterGroup(input: $input, condition: $condition) {
      id
      name
      filters
      createdAt
      updatedAt
      owner
    }
  }
`;

const deleteSearchFilterGroup = /* GraphQL */ `
  mutation DeleteSearchFilterGroup(
    $input: DeleteSearchFilterGroupInput!
    $condition: ModelSearchFilterGroupConditionInput
  ) {
    deleteSearchFilterGroup(input: $input, condition: $condition) {
      id
      name
      filters
      createdAt
      updatedAt
      owner
    }
  }
`;

export const useSearchFilterGroups = () => {
    const [groups, setGroups] = useState<SearchFilterGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);
    const { user: currentUser } = useContext(UserContext) as { user?: any };

    const fetchGroups = useCallback(async () => {
        const owner = buildOwnerIdentifier(currentUser);

        if (!owner) {
            setGroups([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = (await API.graphql(
                graphqlOperation(searchFilterGroupsByOwner, { owner })
            )) as GraphQLResult<SearchFilterGroupsByOwnerResponse>;

            if (result.data?.searchFilterGroupsByOwner?.items) {
                setGroups(result.data.searchFilterGroupsByOwner.items);
            } else {
                setGroups([]);
            }
        } catch (err) {
            console.error('Error fetching search filter groups:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const createGroup = async (name: string, filters: any) => {
        try {
            const input = {
                name,
                filters: JSON.stringify(filters),
            };
            const result = (await API.graphql(
                graphqlOperation(createSearchFilterGroup, { input })
            )) as GraphQLResult<{ createSearchFilterGroup: SearchFilterGroup }>;

            const newGroup = result.data?.createSearchFilterGroup;
            if (newGroup) {
                setGroups((prev) => [...prev, newGroup]);
                return newGroup;
            }
        } catch (err) {
            console.error('Error creating search filter group:', err);
            throw err;
        }
    };

    const updateGroup = async (id: string, name: string, filters: any) => {
        try {
            const input = {
                id,
                name,
                filters: JSON.stringify(filters),
            };
            const result = (await API.graphql(
                graphqlOperation(updateSearchFilterGroup, { input })
            )) as GraphQLResult<{ updateSearchFilterGroup: SearchFilterGroup }>;

            const updatedGroup = result.data?.updateSearchFilterGroup;
            if (updatedGroup) {
                setGroups((prev) =>
                    prev.map((g) => (g.id === id ? updatedGroup : g))
                );
                return updatedGroup;
            }
        } catch (err) {
            console.error('Error updating search filter group:', err);
            throw err;
        }
    };

    const deleteGroup = async (id: string) => {
        try {
            const input = { id };
            await API.graphql(graphqlOperation(deleteSearchFilterGroup, { input }));
            setGroups((prev) => prev.filter((g) => g.id !== id));
        } catch (err) {
            console.error('Error deleting search filter group:', err);
            throw err;
        }
    };

    return {
        groups,
        loading,
        error,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
    };
};
