import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { API } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { UserContext } from '../UserContext';

type V2ContentMetadataRecord = {
  id: string;
  title?: string | null;
  frameCount?: number | null;
  status?: number | null;
};

type AliasRecord = {
  id: string;
  v2ContentMetadata?: V2ContentMetadataRecord | null;
};

type ListAliasesWithMetadataResponse = {
  listAliases?: {
    items?: (AliasRecord | null)[] | null;
    nextToken?: string | null;
  } | null;
};

const LIST_ALIASES_WITH_METADATA = /* GraphQL */ `
  query ListAliasesWithMetadata($limit: Int, $nextToken: String) {
    listAliases(limit: $limit, nextToken: $nextToken) {
      items {
        id
        aliasV2ContentMetadataId
        v2ContentMetadata {
          id
          title
          frameCount
          status
        }
      }
      nextToken
    }
  }
`;

const PAGE_SIZE = 200;

const formatCount = (value: number | null): string => {
  if (value === null) {
    return '—';
  }

  return value.toLocaleString();
};

const AdminFrameTotalsPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameTotal, setFrameTotal] = useState<number | null>(null);
  const [titleCount, setTitleCount] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const isFetchingRef = useRef(false);

  const fetchFrameTotals = useCallback(async () => {
    if (!isAdmin || isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      let nextToken: string | null = null;
      let runningTotal = 0;
      const seenMetadataIds = new Set<string>();

      do {
        const variables: Record<string, unknown> = { limit: PAGE_SIZE };
        if (nextToken) {
          variables.nextToken = nextToken;
        }

        const response = (await API.graphql({
          query: LIST_ALIASES_WITH_METADATA,
          variables,
          authMode: 'API_KEY',
        })) as GraphQLResult<ListAliasesWithMetadataResponse>;

        const connection = response.data?.listAliases;
        const items = connection?.items ?? [];

        items
          .filter((alias): alias is AliasRecord => Boolean(alias && alias.id))
          .forEach((alias) => {
            const metadata = alias.v2ContentMetadata;
            if (!metadata?.id || seenMetadataIds.has(metadata.id)) {
              return;
            }

            seenMetadataIds.add(metadata.id);

            const rawCount = metadata.frameCount;
            const parsedCount = typeof rawCount === 'number' ? rawCount : Number(rawCount ?? 0);

            if (Number.isFinite(parsedCount)) {
              runningTotal += parsedCount;
            }
          });

        nextToken = connection?.nextToken ?? null;
      } while (nextToken);

      setFrameTotal(runningTotal);
      setTitleCount(seenMetadataIds.size);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Unable to load frame totals.';
      setError(message);
      setFrameTotal(null);
      setTitleCount(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchFrameTotals();
    }
  }, [isAdmin, fetchFrameTotals]);

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning">
          This page is restricted to administrators. Please sign in with an admin account.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Frame totals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fetches all shows and movies and sums their frame counts.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Combined frames
                </Typography>
                <Typography variant="h3">{formatCount(frameTotal)}</Typography>
              </Box>

              {titleCount !== null && (
                <Typography variant="body2" color="text.secondary">
                  Counted across {titleCount} unique titles.
                </Typography>
              )}

              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Button variant="contained" onClick={fetchFrameTotals} disabled={isLoading}>
                  {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Refresh total'}
                </Button>
                {lastUpdatedAt && (
                  <Typography variant="body2" color="text.secondary">
                    Last updated {new Date(lastUpdatedAt).toLocaleString()}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
};

export default AdminFrameTotalsPage;
