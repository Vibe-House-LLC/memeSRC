import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Popover,
  type PopoverProps,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListSubheader,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useMediaQuery from '@mui/material/useMediaQuery';
import FavoriteToggle from './FavoriteToggle';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { normalizeColorValue } from '../utils/colors';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import CheckIcon from '@mui/icons-material/Check';

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
  anchorEl?: HTMLElement | null;
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
  const normalizedHighlight = normalizeColorValue(series?.colorMain);
  const highlightColor = normalizedHighlight || theme.palette.primary.main;
  const normalizedText = normalizeColorValue(series?.colorSecondary);
  const textColor = normalizedText
    || (normalizedHighlight ? theme.palette.getContrastText(highlightColor) : theme.palette.primary.contrastText);
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
  const borderTone = alpha(theme.palette.grey[700], isLight ? 0.85 : 0.55);
  const hoverBorderTone = alpha(theme.palette.grey[500], isLight ? 0.95 : 0.7);
  const backgroundColor = alpha(theme.palette.grey[900], isLight ? 0.985 : 0.7);
  const backgroundGradient = `linear-gradient(135deg, ${alpha(theme.palette.grey[900], isLight ? 0.995 : 0.82)} 0%, ${alpha(theme.palette.grey[800], isLight ? 0.94 : 0.72)} 55%, ${alpha(theme.palette.grey[700], isLight ? 0.88 : 0.62)} 100%)`;
  const textColor = theme.palette.common.white;
  const subTextColor = alpha(theme.palette.common.white, isLight ? 0.7 : 0.62);

  return {
    border: '1px solid',
    borderColor: borderTone,
    borderRadius: 2,
    marginBottom: theme.spacing(0.75),
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    boxShadow: theme.shadows[4],
    backgroundColor,
    backgroundImage: backgroundGradient,
    color: textColor,
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover:not(.Mui-selected)': {
      borderColor: hoverBorderTone,
      boxShadow: theme.shadows[7],
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
  const baseBorder = alpha(theme.palette.grey[700], isLight ? 0.9 : 0.6);
  const hoverBorder = alpha(theme.palette.grey[500], isLight ? 0.95 : 0.72);
  const baseBg = alpha(theme.palette.grey[900], isLight ? 0.58 : 0.65);
  const hoverBg = alpha(theme.palette.grey[900], isLight ? 0.66 : 0.75);
  const primaryText = theme.palette.common.white;
  const secondaryText = alpha(theme.palette.common.white, isLight ? 0.68 : 0.72);

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
    boxShadow: theme.shadows[2],
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
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
    },
    ...getSelectedListItemStyles(theme, series),
  };
};

const sectionHeaderSx = (theme: Theme, options?: { topSpacing?: 'tight' | 'regular' }) => {
  const topSpacing = options?.topSpacing === 'tight' ? 0.75 : 1;

  return {
    bgcolor: 'transparent',
    px: 0,
    pt: theme.spacing(topSpacing),
    pb: theme.spacing(0.5),
    fontSize: '0.95rem',
    fontWeight: 700,
    color: theme.palette.text.secondary,
  };
};

const radioIconSx = (theme: Theme, selected: boolean, options?: { inverted?: boolean }) => {
  const inverted = Boolean(options?.inverted);
  const baseColor = inverted
    ? alpha(theme.palette.common.white, theme.palette.mode === 'light' ? 0.55 : 0.5)
    : alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.5 : 0.45);
  const selectedColor = theme.palette.common.white;

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
  const {
    open,
    onClose,
    onSelect,
    shows,
    savedCids,
    currentValueId,
    includeAllFavorites = true,
    anchorEl,
  } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState<string>('');
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

  // Reset state each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setFilter('');
    requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0 });
    });
    if (!isMobile) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open, isMobile]);

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

  const showQuickPicks = !isFiltering;
  const favoritesForSection = showQuickPicks ? filteredFavorites : [];
  const showEverythingHeader = showQuickPicks;
  const hasFavoriteSelectionInQuick = showQuickPicks && favoritesForSection.some((fav) => fav.id === currentValueId);

  const desktopMaxHeight = isFiltering ? 'calc(100vh - 96px)' : 'min(480px, calc(100vh - 96px))';

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

  const renderFilterInput = () => (
    <TextField
      inputRef={inputRef}
      variant="outlined"
      fullWidth
      placeholder="Type to filter (titles)..."
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      onKeyDown={handleKeyDown}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" sx={{ opacity: 0.8 }} />
          </InputAdornment>
        ),
        endAdornment: filter ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              edge="end"
              onClick={(e) => {
                e.stopPropagation();
                setFilter('');
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{
        flex: 1,
        '& .MuiOutlinedInput-root': {
          borderRadius: isMobile ? 1 : 1.5,
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
  );

  const listContent = (
    <List
      disablePadding
      sx={{
        bgcolor: 'transparent',
        px: { xs: 1.5, sm: 2 },
        pt: showQuickPicks ? (isMobile ? 1 : 1.25) : isMobile ? 0.6 : 0.75,
        pb: { xs: 1.5, sm: 2 },
      }}
    >

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
          <ListSubheader disableSticky component="div" sx={(theme) => sectionHeaderSx(theme, { topSpacing: 'tight' })}>
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

          {favoritesForSection.length > 0 && (
            <>
              <ListSubheader
                disableSticky
                component="div"
                sx={(theme) => sectionHeaderSx(theme, { topSpacing: showQuickPicks ? 'regular' : 'tight' })}
              >
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
                    <Box sx={(theme) => radioIconSx(theme, isSelected, { inverted: true })}>
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
            </>
          )}
        </>
      )}

      {filteredAllSeries.length > 0 && (
        <>
          {showEverythingHeader && (
            <ListSubheader
              disableSticky
              component="div"
              sx={(theme) => sectionHeaderSx(
                theme,
                { topSpacing: showQuickPicks || favoritesForSection.length > 0 ? 'regular' : 'tight' }
              )}
            >
              Everything
            </ListSubheader>
          )}
          {filteredAllSeries.map((s, index) => {
            const isSelected = currentValueId === s.id && !(hasFavoriteSelectionInQuick && s.isFavorite);
            return (
              <ListItemButton
                key={s.id}
                selected={isSelected}
                onClick={() => handleSelect(s.id)}
                sx={(theme) => {
                  const base = listCardButtonSx(theme, s);
                  if (!showEverythingHeader && index === 0) {
                    return { ...base, mt: theme.spacing(0.25) };
                  }
                  return base;
                }}
              >
                <Box sx={(theme) => radioIconSx(theme, isSelected, { inverted: true })}>
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
  );

  const mobileMaxHeight = isFiltering
    ? 'min(520px, calc(100vh - 112px))'
    : 'min(460px, calc(100vh - 112px))';

  const popoverAnchorOrigin: PopoverProps['anchorOrigin'] = isMobile
    ? { vertical: 'bottom', horizontal: 'center' }
    : { vertical: 'bottom', horizontal: 'left' };

  const popoverTransformOrigin: PopoverProps['transformOrigin'] = isMobile
    ? { vertical: 'top', horizontal: 'center' }
    : { vertical: 'top', horizontal: 'left' };

  if (!anchorEl) {
    if (!isMobile) return null;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
        PaperProps={{
          sx: {
            width: 'calc(100vw - 24px)',
            maxWidth: 440,
            height: 'min(80vh, 600px)',
            mt: 2,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent
          dividers
          sx={{
            p: 0,
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            minHeight: 0,
            bgcolor: 'background.default',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              py: 0,
              minHeight: 64,
              borderBottom: '1px solid',
              borderColor: 'divider',
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
            {renderFilterInput()}
            <IconButton
              aria-label="Done"
              size="small"
              onClick={() => {
                inputRef.current?.blur();
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
              <CheckIcon fontSize="medium" />
            </IconButton>
          </Box>
          <Box
            ref={contentRef}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              bgcolor: 'background.default',
            }}
          >
            {listContent}
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={popoverAnchorOrigin}
      transformOrigin={popoverTransformOrigin}
      PaperProps={{
        sx: (theme) => ({
          mt: isMobile ? 0.75 : 1,
          width: isMobile ? 'min(420px, calc(100vw - 24px))' : 420,
          maxWidth: 'min(420px, calc(100vw - 24px))',
          maxHeight: isMobile ? mobileMaxHeight : desktopMaxHeight,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: isMobile ? theme.spacing(1.75) : theme.spacing(1.25),
          overflow: 'hidden',
          boxShadow: isMobile ? theme.shadows[10] : theme.shadows[12],
        }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: isMobile ? 1.5 : 2,
            pt: isMobile ? 1.25 : 1.5,
            pb: isMobile ? 0.75 : 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
            Select show or movie
          </Typography>
          <IconButton aria-label="Close" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box
          sx={{
            px: isMobile ? 1.5 : 2,
            py: isMobile ? 0.75 : 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {renderFilterInput()}
        </Box>
        <Box
          ref={contentRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: 'background.default',
          }}
        >
          {listContent}
        </Box>
      </Box>
    </Popover>
  );
}
