import { useState, useEffect, useCallback } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';

// Define types locally until codegen runs
export interface SearchFilterGroup {
    id: string;
    name: string;
    filters: string; // AWSJSON is string
    createdAt: string;
    updatedAt: string;
    owner?: string;
}

interface ListSearchFilterGroupsResponse {
    listSearchFilterGroups: {
        items: SearchFilterGroup[];
        nextToken: string | null;
    };
}

// GraphQL Operations (Inline to avoid dependency on un-generated files)
const listSearchFilterGroups = /* GraphQL */ `
  query ListSearchFilterGroups(
    $filter: ModelSearchFilterGroupFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSearchFilterGroups(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        name
        filters
        createdAt
        updatedAt
        owner
      }
      nextToken
    }
  }
`;

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

    const fetchGroups = useCallback(async () => {
        try {
            setLoading(true);
            const result = (await API.graphql(
                graphqlOperation(listSearchFilterGroups)
            )) as GraphQLResult<ListSearchFilterGroupsResponse>;

            if (result.data?.listSearchFilterGroups?.items) {
                setGroups(result.data.listSearchFilterGroups.items);
            }
        } catch (err) {
            console.error('Error fetching search filter groups:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

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
