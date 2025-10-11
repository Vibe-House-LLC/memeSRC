import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import { SelectChangeEvent } from '@mui/material/Select';
import { UserContext } from '../UserContext';
import { usageEventsByType } from '../graphql/queries';
import { normalizeString } from '../utils/search/normalize';

type UsageEventRecord = {
  id: string;
  eventData?: string | null;
  createdAt?: string | null;
  eventType?: string | null;
  identityId?: string | null;
  sessionId?: string | null;
  updatedAt?: string | null;
};

type UsageEventsResponse = {
  usageEventsByType?: {
    items?: UsageEventRecord[] | null;
    nextToken?: string | null;
  } | null;
};

type SearchVariantSummary = {
  term: string;
  count: number;
};

type SearchGroupSummary = {
  key: string;
  canonicalTerm: string;
  normalizedTerm: string;
  totalCount: number;
  variants: SearchVariantSummary[];
  shareOfIndex: number;
  lastSeen?: number;
};

type IndexSummary = {
  indexKey: string;
  formattedLabel: string;
  totalCount: number;
  uniqueResolvedIndexCount: number;
  resolvedIndexSamples: string[];
  groups: SearchGroupSummary[];
};

type GlobalSearchSummary = {
  key: string;
  canonicalTerm: string;
  normalizedTerm: string;
  totalCount: number;
  variants: SearchVariantSummary[];
  uniqueIndexCount: number;
};

type AggregatedSearchSummary = {
  cutoffIso: string;
  totalRecords: number;
  processedRecords: number;
  skippedRecords: number;
  indexSummaries: IndexSummary[];
  globalGroups: GlobalSearchSummary[];
};

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 200;
const MAX_VARIANTS_TO_SHOW = 5;
const MAX_RESOLVED_INDEX_SAMPLES = 5;
const MAX_GLOBAL_GROUPS = 25;
const ALLOWED_SPECIAL_INDEX_KEYS = new Set(['_universal']);

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isSupportedIndexKey = (indexKey: string): boolean => {
  if (!indexKey || indexKey === 'unknown') {
    return false;
  }

  if (ALLOWED_SPECIAL_INDEX_KEYS.has(indexKey)) {
    return true;
  }

  if (indexKey.startsWith('_')) {
    return false;
  }

  if (indexKey.includes(',')) {
    return false;
  }

  return true;
};

const formatIndexLabel = (indexKey: string): string => {
  if (!indexKey || indexKey === 'unknown') {
    return 'Unknown index';
  }

  if (indexKey === '_all') {
    return 'All indices';
  }

  if (indexKey === '_favorites') {
    return 'Favorites (dynamic)';
  }

  if (indexKey.includes(',')) {
    return 'Group / multi-index';
  }

  return indexKey
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const safeParseJSON = (input: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore parse failure
  }

  return null;
};

const deriveSearchTermFromRaw = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const kvMatch = trimmed.match(/searchTerm\s*[:=]\s*["']?([^"'\\n]+)["']?/i);
  if (kvMatch && kvMatch[1]) {
    return collapseWhitespace(kvMatch[1]);
  }

  if (!trimmed.includes('{') && !trimmed.includes('=') && !trimmed.includes(':')) {
    return collapseWhitespace(trimmed);
  }

  return null;
};

const buildSearchBucketKey = (term: string) => {
  const normalized = normalizeString(term);
  if (!normalized) {
    return null;
  }

  const stripped = normalized.replace(/[^a-z0-9]+/g, ' ').trim();
  const collapsed = collapseWhitespace(stripped || normalized);

  if (!collapsed) {
    return null;
  }

  return {
    key: collapsed,
    normalized,
    fallbackDisplay: collapseWhitespace(term),
  };
};

const aggregateSearchEvents = (
  records: UsageEventRecord[],
  cutoffIso: string
): AggregatedSearchSummary => {
  type SearchGroupCollector = {
    key: string;
    normalized: string;
    fallbackDisplay: string;
    totalCount: number;
    variantCounts: Map<string, number>;
    lastSeen?: number;
  };

  type IndexCollector = {
    key: string;
    totalCount: number;
    resolvedIndexSamples: Set<string>;
    groups: Map<string, SearchGroupCollector>;
  };

  type GlobalCollector = {
    key: string;
    normalized: string;
    fallbackDisplay: string;
    totalCount: number;
    variantCounts: Map<string, number>;
    indexKeys: Set<string>;
  };

  const indexCollectors = new Map<string, IndexCollector>();
  const globalCollectors = new Map<string, GlobalCollector>();

  const cutoffTimestamp = Date.parse(cutoffIso);
  let processed = 0;
  let skipped = 0;

  records.forEach((record) => {
    if (!record?.id) {
      skipped += 1;
      return;
    }

    const createdAt = record.createdAt ? Date.parse(record.createdAt) : Number.NaN;
    if (Number.isFinite(cutoffTimestamp) && Number.isFinite(createdAt) && createdAt < cutoffTimestamp) {
      skipped += 1;
      return;
    }

    const rawPayload = typeof record.eventData === 'string' ? record.eventData : '';
    const parsedPayload = rawPayload ? safeParseJSON(rawPayload) : null;

    const searchTermRaw =
      (parsedPayload?.searchTerm as string | undefined) ??
      deriveSearchTermFromRaw(rawPayload) ??
      null;

    const indexKeyRaw =
      (parsedPayload?.index as string | undefined) ??
      (parsedPayload?.resolvedIndex as string | undefined) ??
      null;

    const resolvedIndexRaw = parsedPayload?.resolvedIndex as string | undefined;

    if (!searchTermRaw) {
      skipped += 1;
      return;
    }

    const normalizedTermOriginal = collapseWhitespace(searchTermRaw);
    const bucket = buildSearchBucketKey(normalizedTermOriginal);
    if (!bucket) {
      skipped += 1;
      return;
    }

    const indexKey = collapseWhitespace(indexKeyRaw ?? '') || 'unknown';
    const resolvedIndex = collapseWhitespace(resolvedIndexRaw ?? '');

    if (!isSupportedIndexKey(indexKey)) {
      skipped += 1;
      return;
    }

    processed += 1;

    let indexCollector = indexCollectors.get(indexKey);
    if (!indexCollector) {
      indexCollector = {
        key: indexKey,
        totalCount: 0,
        resolvedIndexSamples: new Set<string>(),
        groups: new Map<string, SearchGroupCollector>(),
      };
      indexCollectors.set(indexKey, indexCollector);
    }

    indexCollector.totalCount += 1;
    if (resolvedIndex) {
      indexCollector.resolvedIndexSamples.add(resolvedIndex);
    }

    let group = indexCollector.groups.get(bucket.key);
    if (!group) {
      group = {
        key: bucket.key,
        normalized: bucket.normalized,
        fallbackDisplay: bucket.fallbackDisplay,
        totalCount: 0,
        variantCounts: new Map<string, number>(),
      };
      indexCollector.groups.set(bucket.key, group);
    }
    group.totalCount += 1;
    const variant = normalizedTermOriginal || bucket.fallbackDisplay;
    group.variantCounts.set(variant, (group.variantCounts.get(variant) ?? 0) + 1);
    if (Number.isFinite(createdAt)) {
      group.lastSeen = group.lastSeen ? Math.max(group.lastSeen, createdAt) : createdAt;
    }

    let globalGroup = globalCollectors.get(bucket.key);
    if (!globalGroup) {
      globalGroup = {
        key: bucket.key,
        normalized: bucket.normalized,
        fallbackDisplay: bucket.fallbackDisplay,
        totalCount: 0,
        variantCounts: new Map<string, number>(),
        indexKeys: new Set<string>(),
      };
      globalCollectors.set(bucket.key, globalGroup);
    }
    globalGroup.totalCount += 1;
    globalGroup.variantCounts.set(
      variant,
      (globalGroup.variantCounts.get(variant) ?? 0) + 1
    );
    globalGroup.indexKeys.add(indexKey);
  });

  const indexSummaries: IndexSummary[] = Array.from(indexCollectors.values())
    .map((collector) => {
      const groups: SearchGroupSummary[] = Array.from(collector.groups.values())
        .map((group) => {
          const variants = Array.from(group.variantCounts.entries())
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, MAX_VARIANTS_TO_SHOW);

          const canonicalTerm =
            variants[0]?.term ?? group.fallbackDisplay ?? group.normalized;

          const shareOfIndex =
            collector.totalCount > 0 ? group.totalCount / collector.totalCount : 0;

          return {
            key: group.key,
            canonicalTerm,
            normalizedTerm: group.normalized,
            totalCount: group.totalCount,
            variants,
            shareOfIndex,
            lastSeen: group.lastSeen,
          };
        })
        .sort((a, b) => b.totalCount - a.totalCount);

      const resolvedSamples = Array.from(collector.resolvedIndexSamples).slice(
        0,
        MAX_RESOLVED_INDEX_SAMPLES
      );

      return {
        indexKey: collector.key,
        formattedLabel: formatIndexLabel(collector.key),
        totalCount: collector.totalCount,
        uniqueResolvedIndexCount: collector.resolvedIndexSamples.size,
        resolvedIndexSamples: resolvedSamples,
        groups,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  const globalGroups: GlobalSearchSummary[] = Array.from(globalCollectors.values())
    .map((group) => {
      const variants = Array.from(group.variantCounts.entries())
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_VARIANTS_TO_SHOW);

      const canonicalTerm = variants[0]?.term ?? group.fallbackDisplay ?? group.normalized;

      return {
        key: group.key,
        canonicalTerm,
        normalizedTerm: group.normalized,
        totalCount: group.totalCount,
        variants,
        uniqueIndexCount: group.indexKeys.size,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, MAX_GLOBAL_GROUPS);

  return {
    cutoffIso,
    totalRecords: records.length,
    processedRecords: processed,
    skippedRecords: skipped,
    indexSummaries,
    globalGroups,
  };
};

const AdminPopularSearchesPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AggregatedSearchSummary | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [selectedIndexKey, setSelectedIndexKey] = useState<string>('');

  const handleLoad = useCallback(async () => {
    if (!isAdmin || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const cutoffIso = new Date(Date.now() - SEVEN_DAYS_IN_MS).toISOString();
    const collected: UsageEventRecord[] = [];

    try {
      let nextToken: string | null = null;
      do {
        const variables: Record<string, unknown> = {
          eventType: 'search',
          createdAt: { ge: cutoffIso },
          sortDirection: 'DESC',
          limit: PAGE_LIMIT,
        };

        if (nextToken) {
          variables.nextToken = nextToken;
        }

        const response = (await API.graphql(
          graphqlOperation(usageEventsByType, variables)
        )) as GraphQLResult<UsageEventsResponse>;

        const connection = response?.data?.usageEventsByType;
        const items = connection?.items ?? [];

        items
          .filter((item): item is UsageEventRecord => Boolean(item && item.id))
          .forEach((item) => collected.push(item));

        nextToken = connection?.nextToken ?? null;
      } while (nextToken);

      const aggregated = aggregateSearchEvents(collected, cutoffIso);
      setSummary(aggregated);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Unable to load search analytics.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isLoading]);

  const metrics = useMemo(() => {
    if (!summary) {
      return null;
    }

    return {
      totalIndices: summary.indexSummaries.length,
      totalProcessed: summary.processedRecords,
      totalSkipped: summary.skippedRecords,
      totalRecords: summary.totalRecords,
    };
  }, [summary]);

  useEffect(() => {
    if (!summary) {
      setSelectedIndexKey('');
      return;
    }

    const availableKeys = summary.indexSummaries.map((item) => item.indexKey);
    if (!availableKeys.length) {
      setSelectedIndexKey('');
      return;
    }

    if (selectedIndexKey && availableKeys.includes(selectedIndexKey)) {
      return;
    }

    const preferredKey = availableKeys.includes('_universal')
      ? '_universal'
      : availableKeys[0];

    if (preferredKey !== selectedIndexKey) {
      setSelectedIndexKey(preferredKey);
    }
  }, [summary, selectedIndexKey]);

  const indexOptions = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.indexSummaries.map((indexSummary) => ({
      value: indexSummary.indexKey,
      label: indexSummary.formattedLabel,
      totalCount: indexSummary.totalCount,
    }));
  }, [summary]);

  const selectedIndexSummary = useMemo(() => {
    if (!summary || !selectedIndexKey) {
      return null;
    }

    return (
      summary.indexSummaries.find((indexSummary) => indexSummary.indexKey === selectedIndexKey) ??
      null
    );
  }, [summary, selectedIndexKey]);

  const handleIndexChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setSelectedIndexKey(event.target.value);
    },
    []
  );

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
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Popular searches (7-day window)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fetches search usage events for the last 7 days, normalizes similar queries, and
            aggregates them per index. Use this to validate the upcoming backend aggregation.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Button variant="contained" onClick={handleLoad} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Load and summarize'}
          </Button>
          {isLoading && <CircularProgress size={24} />}
          {lastUpdatedAt && (
            <Typography variant="body2" color="text.secondary">
              Last updated: {new Date(lastUpdatedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {summary && metrics && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Snapshot
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              divider={<Divider flexItem orientation="vertical" />}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Cutoff
                </Typography>
                <Typography variant="body1">
                  {new Date(summary.cutoffIso).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Processed searches
                </Typography>
                <Typography variant="body1">{metrics.totalProcessed}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Skipped records
                </Typography>
                <Typography variant="body1">{metrics.totalSkipped}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Unique indices
                </Typography>
                <Typography variant="body1">{metrics.totalIndices}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}

        {summary?.globalGroups?.length ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top searches across all indices
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Search term</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell align="right">Indices</TableCell>
                  <TableCell>Common variants</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.globalGroups.map((group, index) => (
                  <TableRow key={group.key}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {group.canonicalTerm}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        normalized: {group.normalizedTerm}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{group.totalCount}</TableCell>
                    <TableCell align="right">{group.uniqueIndexCount}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {group.variants.map((variant) => (
                          <Chip
                            key={`${group.key}-${variant.term}`}
                            size="small"
                            label={`${variant.term} (${variant.count})`}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ) : null}

        {summary ? (
          summary.indexSummaries.length ? (
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
              >
                <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 280 } }}>
                  <InputLabel id="popular-searches-index-label">Index</InputLabel>
                  <Select
                    labelId="popular-searches-index-label"
                    value={selectedIndexKey}
                    label="Index"
                    onChange={handleIndexChange}
                  >
                    {indexOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label} ({option.totalCount})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {selectedIndexSummary && (
                  <Typography variant="body2" color="text.secondary">
                    Searches: {selectedIndexSummary.totalCount} · Unique resolved:{' '}
                    {selectedIndexSummary.uniqueResolvedIndexCount}
                  </Typography>
                )}
              </Stack>

              {selectedIndexSummary ? (
                <Paper key={selectedIndexSummary.indexKey} variant="outlined" sx={{ p: 3 }}>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="h6">
                        {selectedIndexSummary.formattedLabel}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Index key: <strong>{selectedIndexSummary.indexKey}</strong>
                      </Typography>
                      {selectedIndexSummary.uniqueResolvedIndexCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Resolved representations:{' '}
                          {selectedIndexSummary.resolvedIndexSamples.join(', ')}
                          {selectedIndexSummary.uniqueResolvedIndexCount >
                          selectedIndexSummary.resolvedIndexSamples.length
                            ? ` (+${
                                selectedIndexSummary.uniqueResolvedIndexCount -
                                selectedIndexSummary.resolvedIndexSamples.length
                              } more)`
                            : ''}
                        </Typography>
                      )}
                    </Box>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Rank</TableCell>
                          <TableCell>Search term</TableCell>
                          <TableCell align="right">Count</TableCell>
                          <TableCell align="right">Share</TableCell>
                          <TableCell>Variants</TableCell>
                          <TableCell>Last seen</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedIndexSummary.groups.map((group, groupIndex) => (
                          <TableRow key={group.key}>
                            <TableCell>{groupIndex + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {group.canonicalTerm}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                normalized: {group.normalizedTerm}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{group.totalCount}</TableCell>
                            <TableCell align="right">
                              {(group.shareOfIndex * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {group.variants.map((variant) => (
                                  <Chip
                                    key={`${group.key}-${variant.term}`}
                                    size="small"
                                    label={`${variant.term} (${variant.count})`}
                                  />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {group.lastSeen ? new Date(group.lastSeen).toLocaleString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Stack>
                </Paper>
              ) : (
                <Alert severity="info">Select an index to view normalized searches.</Alert>
              )}
            </Stack>
          ) : (
            <Alert severity="info">No recent search activity within the last 7 days.</Alert>
          )
        ) : null}
      </Stack>
    </Container>
  );
};

export default AdminPopularSearchesPage;
