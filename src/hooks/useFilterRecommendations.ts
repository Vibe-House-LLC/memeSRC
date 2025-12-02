import { useMemo } from 'react';

export type ScopeShortcutKind = 'default' | 'series' | 'custom';

export interface ScopeShortcutOption {
  id: string;
  primary: string;
  secondary?: string;
  emoji?: string;
  tokens: string[];
  normalizedPrimary: string;
  rank: number;
  kind: ScopeShortcutKind;
}

export interface RecommendedFilter extends ScopeShortcutOption {
  matchedWords: string[];
}

export interface SeriesItem {
  id: string;
  title?: string;
  name?: string;
  emoji?: string;
  isFavorite?: boolean;
  updatedAt?: string;
  createdAt?: string;
  slug?: string;
  cleanTitle?: string;
  shortId?: string;
}

export interface CustomFilter {
  id: string;
  title?: string;
  name?: string;
  emoji?: string;
  items?: string[];
}

// Helper functions
const normalizeShortcutText = (input: string): string =>
  String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const normalizeLooseText = (input: string): string =>
  normalizeShortcutText(input)
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const coerceTimestamp = (value: unknown): number => {
  if (!value) return 0;
  const date = new Date(value as any);
  const time = date.getTime();
  return Number.isFinite(time) ? time : 0;
};

const buildShortcutTokens = (...values: Array<string | string[] | undefined | null>): string[] => {
  const tokens: string[] = [];
  values.forEach((value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = normalizeShortcutText(item);
        if (normalized) tokens.push(normalized);
      });
      return;
    }
    const normalized = normalizeShortcutText(value);
    if (normalized) tokens.push(normalized);
  });
  return Array.from(new Set(tokens));
};

export interface UseFilterRecommendationsParams {
  query: string;
  shows?: SeriesItem[];
  savedCids?: SeriesItem[];
  customFilters?: CustomFilter[];
  currentValueId?: string;
  includeAllFavorites?: boolean;
}

export function useFilterRecommendations({
  query,
  shows = [],
  savedCids = [],
  customFilters = [],
  currentValueId = '',
  includeAllFavorites = false,
}: UseFilterRecommendationsParams): RecommendedFilter[] {
  const scopeShortcutOptions = useMemo<ScopeShortcutOption[]>(() => {
    const map = new Map<string, ScopeShortcutOption>();

    const upsertOption = (option: ScopeShortcutOption) => {
      if (!option.primary) return;
      if (!map.has(option.id) || option.kind === 'custom') {
        map.set(option.id, option);
      }
    };

    const upsertSeriesOption = (series: SeriesItem, kind: ScopeShortcutKind) => {
      if (!series?.id) return;
      const label = series.title || series.name;
      if (!label) return;
      const extendedSeries = series as SeriesItem & { slug?: string; cleanTitle?: string; shortId?: string };
      const option: ScopeShortcutOption = {
        id: series.id,
        primary: label,
        secondary: kind === 'custom' ? 'Custom filter' : 'Direct index',
        emoji: series.emoji?.trim(),
        tokens: buildShortcutTokens(
          label,
          series.name,
          series.id,
          extendedSeries.slug,
          extendedSeries.cleanTitle,
          extendedSeries.shortId,
        ),
        normalizedPrimary: normalizeShortcutText(label),
        rank: kind === 'custom' ? 2 : 3,
        kind,
      };
      upsertOption(option);
    };

    shows?.forEach((item) => upsertSeriesOption(item, 'series'));
    savedCids?.forEach((item) => upsertSeriesOption(item, 'series'));
    customFilters?.forEach((item) => upsertSeriesOption(item as any, 'custom'));

    if (includeAllFavorites) {
      upsertOption({
        id: '_favorites',
        primary: 'Favorites',
        secondary: 'Every saved favorite quote',
        emoji: '⭐',
        tokens: buildShortcutTokens('favorites', 'favorite', 'fav', 'all favorites'),
        normalizedPrimary: normalizeShortcutText('Favorites'),
        rank: 0,
        kind: 'default',
      });
    }

    upsertOption({
      id: '_universal',
      primary: 'Everything',
      secondary: 'Search entire catalog',
      emoji: '🌈',
      tokens: buildShortcutTokens('all', 'everything', 'universal', 'global', 'movies', 'shows'),
      normalizedPrimary: normalizeShortcutText('Everything'),
      rank: includeAllFavorites ? 1 : 0,
      kind: 'default',
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.primary.localeCompare(b.primary);
    });
  }, [shows, savedCids, customFilters, includeAllFavorites]);

  const filterMatchSections = useMemo(() => {
    const trimmedValue = query.trim();

    // Extract @-prefixed terms for high-priority matching (e.g., "@seinfeld" -> "seinfeld")
    const atMentionTokens = trimmedValue
      .split(/\s+/)
      .filter((token) => token.startsWith('@') && token.length > 1)
      .map((token) => normalizeShortcutText(token.substring(1)))
      .filter(Boolean);

    const normalizedQueryLoose = normalizeLooseText(trimmedValue);
    const queryTokens = normalizedQueryLoose
      ? normalizedQueryLoose.split(/\s+/).filter((token) => token.length >= 2)
      : [];
    const boundaryTokens = queryTokens.length > 0
      ? Array.from(new Set([queryTokens[0], queryTokens[queryTokens.length - 1]].filter(Boolean)))
      : [];
    const shouldBoostWithQuery = boundaryTokens.length > 0;

    const excludedIds = new Set([currentValueId].filter(Boolean));
    const entryMap = new Map<string, { option: ScopeShortcutOption; matchedWords: Set<string> }>();
    const baseOrder: string[] = [];

    const addOption = (option?: ScopeShortcutOption | null, matchedWords: string[] = []) => {
      if (!option || !option.id || excludedIds.has(option.id)) return;
      let entry = entryMap.get(option.id);
      if (!entry) {
        entry = { option, matchedWords: new Set<string>() };
        entryMap.set(option.id, entry);
        baseOrder.push(option.id);
      }
      matchedWords.filter(Boolean).forEach((word) => entry!.matchedWords.add(normalizeLooseText(word)));
    };

    const addOptions = (options: Array<ScopeShortcutOption | undefined | null>) => {
      options.forEach((opt) => addOption(opt));
    };

    const getOptionById = (id?: string | null) => scopeShortcutOptions.find((opt) => opt.id === id);

    const getOptionsForIds = (ids: Array<string | undefined>) =>
      ids
        .map((id) => getOptionById(id))
        .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const favoriteShows = (shows || []).filter((show) => show.isFavorite);
    const favoritesByUpdated = [...favoriteShows].sort(
      (a, b) =>
        coerceTimestamp(b?.updatedAt || (b as any)?.createdAt) - coerceTimestamp(a?.updatedAt || (a as any)?.createdAt)
    );
    const favoriteOptions = favoritesByUpdated
      .map((show) => getOptionById(show.id))
      .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const recentShowOptions = (shows || [])
      .slice()
      .sort(
        (a, b) =>
          coerceTimestamp(b?.updatedAt || (b as any)?.createdAt) -
          coerceTimestamp(a?.updatedAt || (a as any)?.createdAt)
      )
      .map((show) => getOptionById(show.id))
      .filter((opt): opt is ScopeShortcutOption => Boolean(opt) && !excludedIds.has(opt!.id));

    const addRecentUntil = (limit: number) => {
      for (let i = 0; i < recentShowOptions.length && entryMap.size < limit; i += 1) {
        addOption(recentShowOptions[i]);
      }
    };

    // Custom filter group - show items within the group
    if (currentValueId && currentValueId.startsWith('custom_')) {
      const customFilter = customFilters.find((f) => f.id === currentValueId);
      if (customFilter?.items) {
        const groupItems = getOptionsForIds(customFilter.items);
        addOptions(groupItems);
      }
    }

    // Favorites scope
    if (currentValueId === '_favorites') {
      addOptions(favoriteOptions);
    }

    // Universal scope
    if (currentValueId === '_universal') {
      if (includeAllFavorites) {
        addOption(getOptionById('_favorites'));
        addOptions(favoriteOptions);
      }
      addRecentUntil(10);
    }

    // Specific show - still offer favorites toggle if applicable
    const isSpecificShow = currentValueId && !currentValueId.startsWith('_') && !currentValueId.startsWith('custom_');
    if (isSpecificShow && includeAllFavorites) {
      addOption(getOptionById('_favorites'));
    }

    // Backfill with favorites/recent to hit ~10 items
    if (entryMap.size < 10) {
      addOptions(favoriteOptions);
    }
    addRecentUntil(10);

    // Final fallback: any remaining options to avoid empties
    if (entryMap.size < 10) {
      scopeShortcutOptions.forEach((opt) => addOption(opt));
    }

    if (entryMap.size === 0) {
      addOption(getOptionById(currentValueId));
    }

    const baseOrdered = baseOrder
      .map((id) => entryMap.get(id))
      .filter((entry): entry is { option: ScopeShortcutOption; matchedWords: Set<string> } => Boolean(entry));
    const baseIndexMap = new Map<string, number>();
    baseOrdered.forEach((opt, idx) => {
      baseIndexMap.set(opt.option.id, idx);
    });

    let prioritized: Array<{ option: ScopeShortcutOption; matchedWords: Set<string> }> = [];

    if (shouldBoostWithQuery) {
      const queryMatches = scopeShortcutOptions
        .filter((option) => option?.id && !excludedIds.has(option.id))
        .map((option) => {
          const normalizedPrimary = normalizeLooseText(option.primary);
          const normalizedQuery = normalizedQueryLoose;
          const primaryTokens = normalizedPrimary.split(/\s+/).filter(Boolean);
          const tokenSet = new Set<string>(
            [
              ...primaryTokens,
              ...(Array.isArray(option.tokens) ? option.tokens.map(normalizeLooseText) : []),
            ].filter((token) => Boolean(token) && token.length >= 2)
          );

          // Check for @-mention matches (highest priority)
          const normalizedPrimaryShortcut = normalizeShortcutText(option.primary);
          const atMentionExactMatch = atMentionTokens.some(
            (atToken) => normalizedPrimaryShortcut === atToken
          );
          const atMentionPrefixMatch = atMentionTokens.some(
            (atToken) => normalizedPrimaryShortcut.startsWith(atToken) || atToken.startsWith(normalizedPrimaryShortcut)
          );

          // Check for exact full match
          const isExactMatch = normalizedPrimary === normalizedQuery;

          // Check for prefix match (query matches start of primary)
          const isPrefixMatch = normalizedPrimary.startsWith(normalizedQuery);

          // Check for word-boundary prefix match (query matches start of any word)
          const hasWordPrefixMatch = primaryTokens.some(token => token.startsWith(normalizedQuery));

          // Include @-mention tokens in matches if they match
          const atMentionMatches = atMentionTokens.filter((atToken) => {
            return normalizedPrimaryShortcut === atToken ||
                   normalizedPrimaryShortcut.startsWith(atToken) ||
                   atToken.startsWith(normalizedPrimaryShortcut);
          });

          const allMatches = [
            ...atMentionMatches,
            ...queryTokens.filter((queryToken) => {
              return Array.from(tokenSet).some(
                (token) =>
                  token === queryToken ||
                  token.startsWith(queryToken) ||
                  queryToken.startsWith(token)
              );
            })
          ];

          const boundaryMatches = boundaryTokens.filter((queryToken) => {
            return Array.from(tokenSet).some(
              (token) =>
                token === queryToken ||
                token.startsWith(queryToken) ||
                queryToken.startsWith(token)
            );
          });

          // Calculate match completeness (what percentage of the option name is matched)
          const matchedChars = allMatches.reduce((sum, match) => sum + match.length, 0);
          const totalChars = normalizedPrimary.replace(/\s+/g, '').length;
          const completeness = totalChars > 0 ? matchedChars / totalChars : 0;

          // Enhanced scoring:
          // - @-mention exact matches: score -1 (highest priority)
          // - @-mention prefix matches: score -0.5
          // - Exact matches: score 0
          // - Prefix matches: score 1
          // - Word prefix matches: score 2
          // - Boundary matches with high completeness: score 3-5 based on completeness
          // - Other boundary matches: score 6+
          let matchScore = Number.POSITIVE_INFINITY;
          if (atMentionExactMatch) {
            matchScore = -1;
          } else if (atMentionPrefixMatch) {
            matchScore = -0.5;
          } else if (boundaryMatches.length > 0) {
            if (isExactMatch) {
              matchScore = 0;
            } else if (isPrefixMatch) {
              matchScore = 1;
            } else if (hasWordPrefixMatch) {
              matchScore = 2;
            } else if (completeness >= 0.7) {
              matchScore = 3;
            } else if (completeness >= 0.5) {
              matchScore = 4;
            } else if (completeness >= 0.3) {
              matchScore = 5;
            } else {
              matchScore = 6;
            }
          }

          const baseIndex = baseIndexMap.has(option.id) ? baseIndexMap.get(option.id)! : Number.POSITIVE_INFINITY;

          return {
            option,
            matches: allMatches,
            boundaryMatches,
            matchScore,
            completeness,
            baseIndex,
          };
        })
        .filter(({ matchScore, boundaryMatches }) => (boundaryMatches.length > 0 || matchScore < 0) && Number.isFinite(matchScore))
        .sort((a, b) => {
          // Primary sort by match score (lower is better)
          if (a.matchScore !== b.matchScore) return a.matchScore - b.matchScore;
          // Secondary sort by number of matches (more is better)
          if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
          // Tertiary sort by completeness (higher is better)
          if (Math.abs(a.completeness - b.completeness) > 0.01) return b.completeness - a.completeness;
          // Final sort by base index
          return a.baseIndex - b.baseIndex;
        })
        .map(({ option, matches }) => {
          addOption(option, matches);
          return entryMap.get(option.id)!;
        });

      prioritized = queryMatches;
    }

    const final: Array<{ option: ScopeShortcutOption; matchedWords: Set<string> }> = [];
    const pushUnique = (entry?: { option: ScopeShortcutOption; matchedWords: Set<string> } | null) => {
      if (!entry || !entry.option?.id) return;
      if (final.some((existing) => existing.option.id === entry.option.id)) return;
      final.push(entry);
    };

    prioritized.forEach((entry) => pushUnique(entry));
    baseOrdered.forEach((entry) => pushUnique(entry));
    scopeShortcutOptions.forEach((opt) => pushUnique(entryMap.get(opt.id)));

    return {
      recommended: final.slice(0, 10).map((entry) => ({
        ...entry.option,
        matchedWords: Array.from(entry.matchedWords),
      })),
    };
  }, [currentValueId, customFilters, includeAllFavorites, scopeShortcutOptions, shows, query]);

  return filterMatchSections.recommended;
}
