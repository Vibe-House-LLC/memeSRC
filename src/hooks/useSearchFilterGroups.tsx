import {
    useState,
    useEffect,
    useCallback,
    useContext,
    useRef,
    createContext,
    ReactNode,
} from 'react';
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

const STALE_AFTER_MS = 2 * 60 * 1000; // simple staleness guard; refresh on focus/visibility if older

type FetchOptions = {
    force?: boolean;
    background?: boolean;
};

type SearchFilterGroupsContextValue = {
    groups: SearchFilterGroup[];
    loading: boolean;
    refreshing: boolean;
    error: any;
    fetchGroups: (options?: FetchOptions) => Promise<SearchFilterGroup[]>;
    createGroup: (name: string, filters: any) => Promise<SearchFilterGroup | undefined>;
    updateGroup: (id: string, name: string, filters: any) => Promise<SearchFilterGroup | undefined>;
    deleteGroup: (id: string) => Promise<void>;
};

const SearchFilterGroupsContext = createContext<SearchFilterGroupsContextValue | undefined>(undefined);

export const SearchFilterGroupsProvider = ({ children }: { children: ReactNode }) => {
    const { user: currentUser } = useContext(UserContext) as { user?: any };
    const [groups, setGroups] = useState<SearchFilterGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<any>(null);
    const inFlightRef = useRef<Promise<SearchFilterGroup[]> | null>(null);
    const lastFetchedRef = useRef<number | null>(null);
    const groupsRef = useRef<SearchFilterGroup[]>([]);

    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    const isStale = useCallback(() => {
        if (lastFetchedRef.current === null) return true;
        return Date.now() - lastFetchedRef.current > STALE_AFTER_MS;
    }, []);

    const runFetch = useCallback(
        async (owner: string, background: boolean) => {
            if (background) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const inflight = (async () => {
                const result = (await API.graphql(
                    graphqlOperation(searchFilterGroupsByOwner, { owner })
                )) as GraphQLResult<SearchFilterGroupsByOwnerResponse>;

                return result.data?.searchFilterGroupsByOwner?.items ?? [];
            })();

            inFlightRef.current = inflight;

            try {
                const fetched = await inflight;
                setGroups(fetched);
                setError(null);
                lastFetchedRef.current = Date.now();
                return fetched;
            } catch (err) {
                setError(err);
                throw err;
            } finally {
                inFlightRef.current = null;
                if (background) {
                    setRefreshing(false);
                } else {
                    setLoading(false);
                }
            }
        },
        []
    );

    const fetchGroups = useCallback(
        async (options?: FetchOptions) => {
            const owner = buildOwnerIdentifier(currentUser);
            if (!owner) {
                setGroups([]);
                setError(null);
                setLoading(false);
                setRefreshing(false);
                lastFetchedRef.current = null;
                return [];
            }

            if (inFlightRef.current) {
                return inFlightRef.current;
            }

            const hasData = groupsRef.current.length > 0;
            const shouldSkip = !options?.force && hasData && !isStale();
            if (shouldSkip) {
                return groupsRef.current;
            }

            return runFetch(owner, Boolean(options?.background));
        },
        [currentUser, isStale, runFetch]
    );

    useEffect(() => {
        fetchGroups({ force: true }).catch(() => {});
    }, [fetchGroups]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            if (isStale()) {
                fetchGroups({ background: true }).catch(() => {});
            }
        };

        const handleFocus = () => {
            if (isStale()) {
                fetchGroups({ background: true }).catch(() => {});
            }
        };

        window.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleFocus);
        };
    }, [fetchGroups, isStale]);

    const createGroup = useCallback(
        async (name: string, filters: any) => {
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
                    setGroups((prev) => {
                        const next = [...prev, newGroup];
                        lastFetchedRef.current = Date.now();
                        return next;
                    });
                    return newGroup;
                }
            } catch (err) {
                console.error('Error creating search filter group:', err);
                throw err;
            }
        },
        []
    );

    const updateGroup = useCallback(
        async (id: string, name: string, filters: any) => {
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
                    setGroups((prev) => {
                        const next = prev.map((g) => (g.id === id ? updatedGroup : g));
                        lastFetchedRef.current = Date.now();
                        return next;
                    });
                    return updatedGroup;
                }
            } catch (err) {
                console.error('Error updating search filter group:', err);
                throw err;
            }
        },
        []
    );

    const deleteGroup = useCallback(async (id: string) => {
        try {
            const input = { id };
            await API.graphql(graphqlOperation(deleteSearchFilterGroup, { input }));
            setGroups((prev) => {
                const next = prev.filter((g) => g.id !== id);
                lastFetchedRef.current = Date.now();
                return next;
            });
        } catch (err) {
            console.error('Error deleting search filter group:', err);
            throw err;
        }
    }, []);

    const value: SearchFilterGroupsContextValue = {
        groups,
        loading,
        refreshing,
        error,
        fetchGroups,
        createGroup,
        updateGroup,
        deleteGroup,
    };

    return (
        <SearchFilterGroupsContext.Provider value={value}>
            {children}
        </SearchFilterGroupsContext.Provider>
    );
};

export const useSearchFilterGroups = (): SearchFilterGroupsContextValue => {
    const context = useContext(SearchFilterGroupsContext);
    if (!context) {
        throw new Error('useSearchFilterGroups must be used within a SearchFilterGroupsProvider');
    }
    return context;
};
