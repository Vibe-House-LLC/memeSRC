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
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useMediaQuery from '@mui/material/useMediaQuery';
import FavoriteToggle from './FavoriteToggle';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

export interface SeriesItem {
  id: string;
  title: string;
  emoji?: string;
  isFavorite?: boolean;
  colorMain?: string;
  colorSecondary?: string;
}

export interface SeriesSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedId: string) => void;
  shows: SeriesItem[];
  savedCids?: SeriesItem[];
  currentValueId?: string;
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

const getSelectedListItemStyles = (theme: Theme, series?: SeriesItem) => {
  const highlightColor = series?.colorMain || theme.palette.primary.main;
  const textColor = series?.colorSecondary
    || (series?.colorMain ? theme.palette.getContrastText(series.colorMain) : theme.palette.primary.contrastText);
  const whiteBorder = alpha(theme.palette.common.white, theme.palette.mode === 'light' ? 0.82 : 0.92);

  return {
    '&.Mui-selected': {
      borderColor: whiteBorder,
      borderWidth: 2,
      backgroundColor: highlightColor,
      backgroundImage: 'none',
      boxShadow: `${theme.shadows[8]}, 0 0 0 1px ${alpha(highlightColor, theme.palette.mode === 'light' ? 0.4 : 0.55)}`,
      color: textColor,
      '& .MuiListItemText-primary': {
        color: textColor,
        fontWeight: 700,
      },
      '& .MuiListItemText-secondary': {
        color: alpha(textColor, 0.85),
      },
    },
    '&.Mui-selected:hover': {
      backgroundColor: highlightColor,
      backgroundImage: 'none',
      borderColor: whiteBorder,
      boxShadow: `${theme.shadows[10]}, 0 0 0 1px ${alpha(highlightColor, theme.palette.mode === 'light' ? 0.5 : 0.65)}`,
      transform: 'translate3d(0,-2px,0)',
    },
  };
};

const quickActionButtonSx = (theme: Theme) => {
  const isLight = theme.palette.mode === 'light';
  const borderTone = alpha(theme.palette.grey[800], isLight ? 0.7 : 0.55);
  const hoverBorderTone = alpha(theme.palette.grey[50], isLight ? 0.7 : 0.55);
  const backgroundColor = alpha(theme.palette.grey[900], isLight ? 0.92 : 0.58);
  const backgroundGradient = `linear-gradient(135deg, ${alpha(theme.palette.grey[900], isLight ? 0.98 : 0.7)} 0%, ${alpha(theme.palette.grey[800], isLight ? 0.9 : 0.6)} 60%, ${alpha(theme.palette.grey[700], isLight ? 0.82 : 0.5)} 100%)`;
  const textColor = theme.palette.common.white;
  const subTextColor = alpha(theme.palette.common.white, isLight ? 0.82 : 0.72);

  return {
    border: '1px solid',
    borderColor: borderTone,
    borderRadius: 2,
    marginBottom: theme.spacing(1),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    boxShadow: theme.shadows[3],
    backgroundColor,
    backgroundImage: backgroundGradient,
    color: textColor,
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover:not(.Mui-selected)': {
      borderColor: hoverBorderTone,
      boxShadow: theme.shadows[6],
      transform: 'translate3d(0,-2px,0)',
    },
    '& .MuiListItemText-primary': {
      color: textColor,
      fontWeight: 700,
    },
    '& .MuiListItemText-secondary': {
      color: subTextColor,
    },
    ...getSelectedListItemStyles(theme),
  };
};

const listCardButtonSx = (theme: Theme, series?: SeriesItem) => {
  const isLight = theme.palette.mode === 'light';
  const baseBorder = alpha(theme.palette.grey[800], isLight ? 0.34 : 0.45);
  const hoverBorder = alpha(theme.palette.grey[900], isLight ? 0.5 : 0.65);
  const baseBg = alpha(theme.palette.grey[900], isLight ? 0.16 : 0.34);
  const hoverBg = alpha(theme.palette.grey[900], isLight ? 0.24 : 0.45);
  const primaryText = isLight ? theme.palette.text.primary : theme.palette.grey[50];
  const secondaryText = isLight ? alpha(theme.palette.text.primary, 0.68) : alpha(theme.palette.grey[100], 0.75);

  return {
    border: '1px solid',
    borderColor: baseBorder,
    borderRadius: 1.5,
    marginBottom: theme.spacing(1),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    backgroundColor: baseBg,
    color: primaryText,
    boxShadow: theme.shadows[1],
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
      duration: theme.transitions.duration.shorter,
    }),
    '& .MuiListItemText-primary': {
      color: primaryText,
      fontWeight: 600,
    },
    '& .MuiListItemText-secondary': {
      color: secondaryText,
    },
    '&:hover:not(.Mui-selected)': {
      borderColor: hoverBorder,
      boxShadow: theme.shadows[4],
      backgroundColor: hoverBg,
      transform: 'translate3d(0,-2px,0)',
    },
    ...getSelectedListItemStyles(theme, series),
  };
};

const radioIconSx = (theme: Theme, selected: boolean, options?: { inverted?: boolean }) => {
  const inverted = Boolean(options?.inverted);
  const baseColor = inverted
    ? alpha(theme.palette.common.white, theme.palette.mode === 'light' ? 0.55 : 0.5)
    : alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.5 : 0.45);
  const selectedColor = inverted
    ? theme.palette.common.white
    : theme.palette.primary.main;

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    color: selected ? selectedColor : baseColor,
    transition: theme.transitions.create('color', {
      duration: theme.transitions.duration.shorter,
    }),
  };
};

export default function SeriesSelectorDialog(props: SeriesSelectorDialogProps) {
  const { open, onClose, onSelect, shows, savedCids, currentValueId, includeAllFavorites = true } = props;
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
    }
    filteredFavorites.forEach((s) => ids.push(s.id));
    filteredAllSeries.forEach((s) => ids.push(s.id));
    return Array.from(new Set(ids));
  }, [filteredFavorites, filteredAllSeries, isFiltering, includeAllFavorites, hasAnyFavorite]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = flatVisibleIds[0];
      if (first) handleSelect(first);
    }
  };

  const showQuickPicks = !isFiltering && !isInputFocused;
  const favoritesForSection = showQuickPicks ? filteredFavorites : [];
  const hasFavoriteSelectionInQuick = showQuickPicks && favoritesForSection.some((fav) => fav.id === currentValueId);

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
                sx={(theme) => quickActionButtonSx(theme)}
              >
                <Box sx={(theme) => radioIconSx(theme, currentValueId === '_universal', { inverted: true })}>
                  {currentValueId === '_universal' ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                </Box>
                <Box component="span" sx={{ fontSize: 24, lineHeight: 1, mr: 1 }}>🌈</Box>
                <ListItemText
                  sx={{ ml: 0, flex: 1 }}
                  primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.1rem', color: 'inherit' } }}
                  primary="All Shows & Movies"
                  secondary="Everything across shows and movies"
                  secondaryTypographyProps={{ sx: { color: 'inherit', opacity: 0.8 } }}
                />
              </ListItemButton>

              {includeAllFavorites && hasAnyFavorite && (
                <ListItemButton
                  selected={currentValueId === '_favorites'}
                  onClick={() => handleSelect('_favorites')}
                  sx={(theme) => ({
                    ...quickActionButtonSx(theme),
                    marginBottom: theme.spacing(1.5),
                  })}
                >
                  <Box sx={(theme) => radioIconSx(theme, currentValueId === '_favorites', { inverted: true })}>
                    {currentValueId === '_favorites' ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                  </Box>
                  <Box component="span" sx={{ fontSize: 24, lineHeight: 1, mr: 1 }}>⭐</Box>
                  <ListItemText
                    sx={{ ml: 0, flex: 1 }}
                    primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.1rem', color: 'inherit' } }}
                    primary="All Favorites"
                    secondary="Only items you've starred as favorites"
                    secondaryTypographyProps={{ sx: { color: 'inherit', opacity: 0.8 } }}
                  />
                </ListItemButton>
              )}

              {(favoritesForSection.length > 0 || filteredAllSeries.length > 0) && (
                <Divider sx={{ mt: 2, mb: 2, opacity: 0.55 }} />
              )}

              {favoritesForSection.length > 0 && (
                <>
                  <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                    Favorites
                  </ListSubheader>
                  {favoritesForSection.map((s) => {
                    const isSelected = currentValueId === s.id;
                    return (
                      <ListItemButton
                        key={s.id}
                        selected={isSelected}
                        onClick={() => handleSelect(s.id)}
                        sx={(theme) => listCardButtonSx(theme, s)}
                      >
                        <Box sx={(theme) => radioIconSx(theme, isSelected)}>
                          {isSelected ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                        </Box>
                        <Box component="span" sx={{ fontSize: 18, lineHeight: 1, mr: 1.25 }}>
                          {s.emoji ? s.emoji : '⭐'}
                        </Box>
                        <ListItemText
                          sx={{ ml: 0, flex: 1 }}
                          primaryTypographyProps={{ sx: { fontWeight: 600, color: 'inherit' } }}
                          primary={s.title}
                        />
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
                    );
                  })}
                  <Divider sx={{ mt: 3 }} />
                </>
              )}
            </>
          )}

          {filteredAllSeries.length > 0 && (
            <>
              <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                Everything
              </ListSubheader>
              {filteredAllSeries.map((s) => {
                const isSelected = currentValueId === s.id && !(hasFavoriteSelectionInQuick && s.isFavorite);
                return (
                  <ListItemButton
                    key={s.id}
                    selected={isSelected}
                    onClick={() => handleSelect(s.id)}
                    sx={(theme) => listCardButtonSx(theme, s)}
                  >
                    <Box sx={(theme) => radioIconSx(theme, isSelected)}>
                      {isSelected ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                    </Box>
                    <Box component="span" sx={{ fontSize: 18, lineHeight: 1, mr: 1.25 }}>
                      {s.emoji ? s.emoji : s.isFavorite ? '⭐' : '🎬'}
                    </Box>
                    <ListItemText
                      sx={{ ml: 0, flex: 1 }}
                      primaryTypographyProps={{ sx: { fontWeight: 600, color: 'inherit' } }}
                      primary={s.title}
                    />
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
                );
              })}
            </>
          )}
        </List>
      </DialogContent>

      
    </Dialog>
  );
}
