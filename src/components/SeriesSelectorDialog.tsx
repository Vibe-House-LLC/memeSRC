import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListSubheader,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useMediaQuery from '@mui/material/useMediaQuery';
import FavoriteToggle from './FavoriteToggle';

export interface SeriesItem {
  id: string;
  title: string;
  emoji?: string;
  isFavorite?: boolean;
}

export interface SeriesSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedId: string) => void;
  shows: SeriesItem[];
  savedCids?: SeriesItem[];
  currentValueId?: string;
  includeEditFavorites?: boolean;
  includeAllFavorites?: boolean;
}

function normalizeString(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function sortSeries<T extends SeriesItem>(items: T[]): T[] {
  return [...items].sort((a, b) => normalizeString(a.title).localeCompare(normalizeString(b.title)));
}

export default function SeriesSelectorDialog(props: SeriesSelectorDialogProps) {
  const { open, onClose, onSelect, shows, savedCids, currentValueId, includeEditFavorites = false, includeAllFavorites = true } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Merge shows + savedCids and dedupe by id
  const baseSeries: SeriesItem[] = useMemo(() => {
    const map = new Map<string, SeriesItem>();
    [...(shows || []), ...(savedCids || [])].forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [shows, savedCids]);

  const allSeries: SeriesItem[] = useMemo(() => {
    if (!favoriteOverrides || Object.keys(favoriteOverrides).length === 0) return baseSeries;
    return baseSeries.map((item) => {
      const override = favoriteOverrides[item.id];
      if (override === undefined) return item;
      return { ...item, isFavorite: override };
    });
  }, [baseSeries, favoriteOverrides]);

  const hasAnyFavorite = useMemo(() => allSeries.some((s) => s.isFavorite), [allSeries]);

  const isFiltering = Boolean(filter && filter.trim());

  const filteredFavorites = useMemo(() => {
    const favorites = allSeries.filter((s) => Boolean(s.isFavorite));
    const list = isFiltering
      ? favorites.filter((s) => normalizeString(s.title).includes(normalizeString(filter)))
      : favorites;
    return sortSeries(list);
  }, [allSeries, filter, isFiltering]);

  const filteredAllSeries = useMemo(() => {
    const list = isFiltering
      ? allSeries.filter((s) => normalizeString(s.title).includes(normalizeString(filter)))
      : allSeries;
    return sortSeries(list);
  }, [allSeries, filter, isFiltering]);

  useEffect(() => {
    if (open && !isMobile) {
      // Desktop: focus immediately for convenience. Mobile: avoid popping keyboard on open.
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
    return;
  }, [open, isMobile]);

  // Ensure the top search input is visible and focused on desktop when opened
  // Mobile: avoid popping keyboard on open; user taps to focus

  // Reset state each time the dialog opens
  useEffect(() => {
    if (open) {
      setFilter('');
      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({ top: 0 });
      });
    }
  }, [open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const flatVisibleIds = useMemo(() => {
    const ids: string[] = [];
    if (!isFiltering) {
      ids.push('_universal');
      if (includeAllFavorites && hasAnyFavorite) ids.push('_favorites');
      if (includeEditFavorites && (hasAnyFavorite || includeEditFavorites)) ids.push('editFavorites');
    }
    filteredFavorites.forEach((s) => ids.push(s.id));
    filteredAllSeries.forEach((s) => ids.push(s.id));
    return Array.from(new Set(ids));
  }, [filteredFavorites, filteredAllSeries, isFiltering, includeAllFavorites, hasAnyFavorite, includeEditFavorites]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = flatVisibleIds[0];
      if (first) handleSelect(first);
    }
  };

  const showQuickPicks = !isFiltering && !isInputFocused;
  const favoritesForSection = showQuickPicks ? filteredFavorites : [];

  const handleFavoriteOverride = useCallback((id: string, nextIsFavorite: boolean) => {
    setFavoriteOverrides((prev) => {
      const baseItem = baseSeries.find((s) => s.id === id);
      const baseValue = baseItem ? Boolean(baseItem.isFavorite) : false;
      if (baseValue === nextIsFavorite) {
        if (!(id in prev)) return prev;
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: nextIsFavorite };
    });
  }, [baseSeries]);

  useEffect(() => {
    setFavoriteOverrides((prev) => {
      if (!prev || Object.keys(prev).length === 0) return prev;
      let hasChanges = false;
      const nextState: Record<string, boolean> = { ...prev };
      Object.keys(prev).forEach((id) => {
        const baseItem = baseSeries.find((s) => s.id === id);
        const baseValue = baseItem ? Boolean(baseItem.isFavorite) : undefined;
        if (baseValue !== undefined && baseValue === prev[id]) {
          delete nextState[id];
          hasChanges = true;
        }
      });
      return hasChanges ? nextState : prev;
    });
  }, [baseSeries]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isMobile ? 'sm' : 'md'}
      scroll="paper"
      fullScreen={isMobile}
      sx={isMobile ? { '& .MuiDialog-container': { alignItems: 'flex-start' }, '& .MuiDialog-paper': { margin: 0, borderRadius: 0 } } : { '& .MuiDialog-container': { alignItems: 'flex-start' }, '& .MuiDialog-paper': { mt: 2, borderRadius: 2 } }}
    >
      {!isMobile && (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Select show or movie
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent dividers ref={contentRef} sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 0,
            py: 0,
            minHeight: 64,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <IconButton
            aria-label="Back"
            size="small"
            onClick={() => {
              setFilter('');
              onClose();
            }}
            sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.primary',
              '&:hover': { backgroundColor: 'action.hover' },
            }}
          >
            <ChevronLeftIcon fontSize="medium" />
          </IconButton>
          <TextField
            inputRef={inputRef}
            variant="outlined"
            fullWidth
            placeholder="Search shows & movies"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ opacity: 0.8 }} />
                </InputAdornment>
              ),
              endAdornment: (
                filter ? (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" onClick={(e) => { e.stopPropagation(); setFilter(''); }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                bgcolor: 'background.paper',
                minHeight: 52,
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'text.primary' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: '1rem',
                py: 1.25,
              },
            }}
          />
        </Box>

        <List disablePadding sx={{ bgcolor: 'transparent', px: 2, py: 2 }}>

          {/* Unified content: quick picks when no filter; results/full list below */}
          {/* No results state */}
          {isFiltering && filteredAllSeries.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No results</Typography>
            </Box>
          )}

          {/* Quick picks when not filtering */}
          {showQuickPicks && (
            <>
              <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                Quick Filters
              </ListSubheader>
              <ListItemButton
                selected={currentValueId === '_universal'}
                onClick={() => handleSelect('_universal')}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 1,
                  py: 2,
                  px: 1,
                  boxShadow: 1,
                  bgcolor: 'background.default',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }}>🌈</Box>
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.1rem' } }}
                  primary="All Shows & Movies"
                  secondary="Everything across shows and movies"
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItemButton>

              {includeAllFavorites && hasAnyFavorite && (
                <ListItemButton
                  selected={currentValueId === '_favorites'}
                  onClick={() => handleSelect('_favorites')}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    mb: 1.5,
                    py: 2,
                    px: 1,
                    boxShadow: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box component="span" sx={{ fontSize: 24, lineHeight: 1 }}>⭐</Box>
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.1rem' } }}
                    primary="All Favorites"
                    secondary="Only items you've starred as favorites"
                    secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                  />
                  {includeEditFavorites && (
                    <Box sx={{ ml: 'auto' }}>
                      <IconButton size="small" aria-label="Edit favorites" onClick={(e) => { e.stopPropagation(); handleSelect('editFavorites'); }}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </ListItemButton>
              )}

              {favoritesForSection.length > 0 && (
                <>
                  <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                    Favorites
                  </ListSubheader>
                  {favoritesForSection.map((s) => (
                    <ListItemButton
                      key={s.id}
                      selected={currentValueId === s.id}
                      onClick={() => handleSelect(s.id)}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        mb: 1,
                        py: 1,
                        px: 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {s.emoji ? (
                          <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</Box>
                        ) : (
                          <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>⭐</Box>
                        )}
                      </ListItemIcon>
                      <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary={s.title} />
                      <Box
                        sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <FavoriteToggle
                          indexId={s.id}
                          initialIsFavorite={Boolean(s.isFavorite)}
                          onToggle={(next) => handleFavoriteOverride(s.id, next)}
                        />
                      </Box>
                    </ListItemButton>
                  ))}
                </>
              )}

              <Divider sx={{ mt: 3 }} />
            </>
          )}

          {filteredAllSeries.length > 0 && (
            <>
              <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                Everything
              </ListSubheader>
              {filteredAllSeries.map((s) => (
                <ListItemButton
                  key={s.id}
                  selected={currentValueId === s.id}
                  onClick={() => handleSelect(s.id)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    mb: 1,
                    py: 1,
                    px: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {s.emoji ? (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</Box>
                    ) : (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.isFavorite ? '⭐' : '🎬'}</Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary={s.title} />
                  <Box
                    sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <FavoriteToggle
                      indexId={s.id}
                      initialIsFavorite={Boolean(s.isFavorite)}
                      onToggle={(next) => handleFavoriteOverride(s.id, next)}
                    />
                  </Box>
                </ListItemButton>
              ))}
            </>
          )}
        </List>
      </DialogContent>

      
    </Dialog>
  );
}
