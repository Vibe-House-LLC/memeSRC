import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, alpha, IconButton, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { RecommendedFilter } from '../hooks/useFilterRecommendations';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { trackUsageEvent } from '../utils/trackUsageEvent';

const STORAGE_KEY_PREFIX = 'memeSRC:dismissedFilterRec:';
const MAX_RECOMMENDATIONS = 3;

const RecommendedFiltersContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(2.5),
}));

const SuggestionBanner = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.spacing(1),
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.25, 1.5),
    gap: theme.spacing(1.5),
  },
}));

const ContentBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flex: 1,
  minWidth: 0,
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1.25),
  },
}));

const FilterChip = styled(Chip)(({ theme }) => ({
  height: 'auto',
  padding: theme.spacing(0.5, 0.25),
  fontSize: '0.8125rem',
  fontWeight: 500,
  backgroundColor: 'transparent',
  color: 'rgba(255, 255, 255, 0.75)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: theme.spacing(0.75),
  cursor: 'pointer',
  '& .MuiChip-label': {
    padding: theme.spacing(0, 1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
}));

interface RecommendedFiltersProps {
  recommendations: RecommendedFilter[];
  currentSearchQuery?: string;
  currentFilterId?: string;
  onFilterSelect?: (filterId: string) => void;
  userId?: string;
}

export const RecommendedFilters: React.FC<RecommendedFiltersProps> = ({
  recommendations,
  currentSearchQuery = '',
  currentFilterId = '',
  onFilterSelect,
  userId,
}) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);
  const hasTrackedImpressionRef = useRef(false);

  // Only show filters that have matched words (i.e., matched based on query content)
  const queryMatchedFilters = recommendations
    .filter((filter) => filter.matchedWords && filter.matchedWords.length > 0)
    .slice(0, MAX_RECOMMENDATIONS);

  // Create a dismissal key based on search query, current filter, and user ID
  // This makes dismissals unique per (user)-(query)-(filter context) combination
  const userKey = userId ? `user:${userId}` : 'anon';
  const filterKey = currentFilterId || '_none';
  const dismissalKey = queryMatchedFilters.length > 0 && currentSearchQuery
    ? `${STORAGE_KEY_PREFIX}${userKey}:${filterKey}:${currentSearchQuery}`
    : '';

  useEffect(() => {
    // Reset dismissal state and impression tracking when the query/filter context changes
    setIsDismissed(false);
    hasTrackedImpressionRef.current = false;
  }, [dismissalKey]);

  useEffect(() => {
    if (queryMatchedFilters.length === 0 || !dismissalKey) return;

    // Check if dismissed
    try {
      const dismissed = localStorage.getItem(dismissalKey);
      if (dismissed === 'true') {
        setIsDismissed(true);
        return;
      }
    } catch (e) {
      // Ignore storage errors
    }

    // Track impression for all shown filters (only once per mount)
    if (!hasTrackedImpressionRef.current) {
      hasTrackedImpressionRef.current = true;
      queryMatchedFilters.forEach((filter) => {
        trackUsageEvent('filter_recommendation_impression', {
          source: 'V2SearchPage',
          recommendedFilterId: filter.id,
          recommendedFilterName: filter.primary,
          searchTerm: currentSearchQuery,
          currentFilterId,
          matchedWords: filter.matchedWords,
          totalRecommendations: queryMatchedFilters.length,
        });
      });
    }
  }, [queryMatchedFilters, dismissalKey, currentSearchQuery, currentFilterId]);

  if (queryMatchedFilters.length === 0 || isDismissed) {
    return null;
  }

  const handleFilterClick = (filter: RecommendedFilter) => (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // Track accept event
    trackUsageEvent('filter_recommendation_accept', {
      source: 'V2SearchPage',
      recommendedFilterId: filter.id,
      recommendedFilterName: filter.primary,
      searchTerm: currentSearchQuery,
      currentFilterId,
      matchedWords: filter.matchedWords,
      totalRecommendations: queryMatchedFilters.length,
    });

    if (onFilterSelect) {
      onFilterSelect(filter.id);
    } else {
      // Strip matched words (including @-mentions) from the query
      let strippedQuery = currentSearchQuery;
      if (filter.matchedWords && filter.matchedWords.length > 0) {
        // Remove matched words and @-mentions from the query
        const wordsToRemove = [...filter.matchedWords];

        // Also remove @-prefixed versions
        const atMentionPattern = currentSearchQuery
          .split(/\s+/)
          .filter((token) => token.startsWith('@'))
          .map((token) => token.substring(1).toLowerCase());

        wordsToRemove.push(...atMentionPattern);

        // Build regex pattern to remove matched words (sort by length so longer prefixes win)
        const pattern = new RegExp(
          [...new Set(wordsToRemove)]
            .sort((a, b) => b.length - a.length)
            .map((word) => `@?${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
            .join('|'),
          'gi'
        );

        strippedQuery = currentSearchQuery
          .replace(pattern, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // If query is blank after stripping, navigate to filter homepage
      if (!strippedQuery) {
        // Navigate to homepage for universal/favorites, or filter page for specific filters
        if (filter.id === '_universal' || filter.id === '_favorites') {
          navigate('/');
        } else {
          navigate(`/${filter.id}`);
        }
      } else {
        // Build URL with both original and stripped query
        const params = new URLSearchParams();
        params.set('searchTerm', strippedQuery);
        if (currentSearchQuery && strippedQuery !== currentSearchQuery) {
          params.set('originalQuery', currentSearchQuery);
        }

        const searchParam = params.toString() ? `?${params.toString()}` : '';
        navigate(`/search/${filter.id}${searchParam}`);
      }
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Track deny event for all filters
    queryMatchedFilters.forEach((filter) => {
      trackUsageEvent('filter_recommendation_deny', {
        source: 'V2SearchPage',
        recommendedFilterId: filter.id,
        recommendedFilterName: filter.primary,
        searchTerm: currentSearchQuery,
        currentFilterId,
        matchedWords: filter.matchedWords,
        totalRecommendations: queryMatchedFilters.length,
      });
    });

    // Save dismissal to localStorage
    try {
      localStorage.setItem(dismissalKey, 'true');
    } catch (e) {
      // Ignore storage errors
    }

    setIsDismissed(true);
  };

  const singleFilter = queryMatchedFilters.length === 1;
  const topFilter = queryMatchedFilters[0];

  // Single filter: simple clickable banner
  if (singleFilter) {
    return (
      <RecommendedFiltersContainer>
        <SuggestionBanner onClick={handleFilterClick(topFilter)}>
          <ContentBox>
            <TuneIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {topFilter.emoji && <span style={{ marginRight: '0.35em' }}>{topFilter.emoji}</span>}
                  Want to filter for {topFilter.primary}?
                </Typography>
                <ArrowForwardIcon
                  sx={{
                    fontSize: '0.95rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    flexShrink: 0,
                  }}
                />
              </Box>
            </Box>
          </ContentBox>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              color: 'rgba(255, 255, 255, 0.3)',
              padding: 0.5,
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.6)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
            aria-label="Dismiss suggestion"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </SuggestionBanner>
      </RecommendedFiltersContainer>
    );
  }

  // Multiple filters: show as clickable chips
  return (
    <RecommendedFiltersContainer>
      <SuggestionBanner sx={{ cursor: 'default' }}>
        <ContentBox sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <TuneIcon sx={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.8125rem',
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              Want to filter?
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pl: 5 }}>
            {queryMatchedFilters.map((filter) => (
              <FilterChip
                key={filter.id}
                label={
                  <>
                    {filter.emoji && <span>{filter.emoji}</span>}
                    <span>{filter.primary}</span>
                  </>
                }
                onClick={handleFilterClick(filter)}
              />
            ))}
          </Box>
        </ContentBox>
        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            color: 'rgba(255, 255, 255, 0.3)',
            padding: 0.5,
            alignSelf: 'flex-start',
            '&:hover': {
              color: 'rgba(255, 255, 255, 0.6)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
          aria-label="Dismiss all suggestions"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </SuggestionBanner>
    </RecommendedFiltersContainer>
  );
};

export default RecommendedFilters;
