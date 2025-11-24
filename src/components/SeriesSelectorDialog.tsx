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
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Typography,
  useTheme,
  Button,
  Divider,
  DialogTitle,
  DialogContentText,
  DialogActions,
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useCustomFilters } from '../hooks/useCustomFilters';

export interface SeriesItem {
  id: string;
  title: string;
  name?: string; // For custom filters
  items?: string[]; // For custom filters
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
  onOpenEditor?: () => void;
  onEdit?: (filter: SeriesItem) => void;

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
      boxShadow: `${theme.shadows[8]}, 0 0 0 1px ${alpha(highlightColor, theme.palette.mode === 'light' ? 0.45 : 0.6)}`,
    },
  };
};

const LAYOUT_SPACING = {
  listPadding: 1.25,
  rowGap: 0.75,
  labelPadding: {
    regular: 1.15,
    tight: 0.9,
  },
} as const;

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
    borderRadius: theme.spacing(1.5),
    paddingTop: theme.spacing(1.05),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(0.92),
    paddingRight: theme.spacing(0.92),
    minHeight: theme.spacing(5.75),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.6),
    boxShadow: theme.shadows[3],
    backgroundColor,
    backgroundImage: backgroundGradient,
    color: textColor,
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover:not(.Mui-selected)': {
      borderColor: hoverBorderTone,
      boxShadow: theme.shadows[4],
    },
    '& .MuiListItemText-primary': {
      color: textColor,
      fontWeight: 700,
      fontSize: '0.98rem',
      lineHeight: 1.12,
    },
    '& .MuiListItemText-secondary': undefined,
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
    paddingTop: theme.spacing(0.38),
    paddingBottom: theme.spacing(0.38),
    paddingLeft: theme.spacing(0.54),
    paddingRight: theme.spacing(0.54),
    minHeight: theme.spacing(3.8),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.55),
    backgroundColor: baseBg,
    color: primaryText,
    boxShadow: theme.shadows[2],
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
      duration: theme.transitions.duration.shorter,
    }),
    '& .MuiListItemText-primary': {
      color: primaryText,
      fontWeight: 600,
      fontSize: '0.92rem',
      lineHeight: 1.08,
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

const sectionHeaderSx = (theme: Theme, options?: { density?: 'tight' | 'regular' }) => {
  const density = options?.density ?? 'regular';
  const paddingBase = LAYOUT_SPACING.labelPadding[density];
  const paddingY = paddingBase / 2;

  return {
    bgcolor: 'transparent',
    px: 0,
    margin: 0,
    paddingTop: theme.spacing(paddingY),
    paddingBottom: theme.spacing(paddingY),
    fontSize: density === 'tight' ? '0.74rem' : '0.76rem',
    fontWeight: 600,
    lineHeight: 1.28,
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
    minWidth: 18,
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
    onOpenEditor,
    onEdit,
  } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState<string>('');
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const { customFilters, removeFilter } = useCustomFilters();
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [filterToDelete, setFilterToDelete] = useState<SeriesItem | null>(null);

  const handleDeleteClick = (filter: SeriesItem) => {
    setFilterToDelete(filter);
    setDeleteConfirmationOpen(true);
  };

  const handleConfirmDelete = () => {
    if (filterToDelete) {
      removeFilter(filterToDelete.id);

      // Check if the deleted filter was the currently selected one
      if (currentValueId === filterToDelete.id) {
        // Switch to default filter
        const defaultFilter = localStorage.getItem('memeSRCDefaultIndex') || '_universal';
        onSelect(defaultFilter);
      }
    }
    setDeleteConfirmationOpen(false);
    setFilterToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmationOpen(false);
    setFilterToDelete(null);
  };

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
      size="small"
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
          minHeight: 44,
          '& fieldset': { borderColor: 'divider' },
          '&:hover fieldset': { borderColor: 'text.primary' },
          '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
        },
        '& .MuiOutlinedInput-input': {
          fontSize: '1rem',
          py: 1,
        },
      }}
    />
  );





  const filterInputListItem = (
    <ListItem
      disablePadding
      sx={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', width: '100%' }}>{renderFilterInput()}</Box>
    </ListItem>
  );

  const listContent = (
    <List
      disablePadding
      sx={{
        bgcolor: 'transparent',
        px: { xs: 1.25, sm: 1.75 },
        pt: (theme) => theme.spacing(LAYOUT_SPACING.listPadding),
        pb: (theme) => theme.spacing(LAYOUT_SPACING.rowGap),
        display: 'flex',
        flexDirection: 'column',
        gap: (theme) => theme.spacing(LAYOUT_SPACING.rowGap),
      }}
    >

      {filterInputListItem}
      {/* Quick Filters (Universal + Favorites) */}
      {showQuickPicks && (
        <>
          <ListSubheader disableSticky component="div" sx={(theme) => sectionHeaderSx(theme, { density: 'tight' })}>
            Quick Filters
          </ListSubheader>

          {/* Universal */}
          <ListItemButton
            selected={currentValueId === '_universal'}
            onClick={() => handleSelect('_universal')}
            sx={(theme) => quickActionButtonSx(theme)}
          >
            <Box sx={(theme) => radioIconSx(theme, currentValueId === '_universal', { inverted: true })}>
              {currentValueId === '_universal' ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
            </Box>
            <Box component="span" sx={{ fontSize: 19, lineHeight: 1, mr: 0.7 }}>🌈</Box>
            <ListItemText
              sx={{ ml: 0, flex: 1 }}
              primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.02rem', color: 'inherit' } }}
              primary="All Shows & Movies"
            />
          </ListItemButton>

          {/* Favorites */}
          {includeAllFavorites && hasAnyFavorite && (
            <ListItemButton
              selected={currentValueId === '_favorites'}
              onClick={() => handleSelect('_favorites')}
              sx={(theme) => quickActionButtonSx(theme)}
            >
              <Box sx={(theme) => radioIconSx(theme, currentValueId === '_favorites', { inverted: true })}>
                {currentValueId === '_favorites' ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
              </Box>
              <Box component="span" sx={{ fontSize: 22, lineHeight: 1, mr: 1 }}>⭐</Box>
              <ListItemText
                sx={{ ml: 0, flex: 1 }}
                primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.02rem', color: 'inherit' } }}
                primary="All Favorites"
              />
            </ListItemButton>
          )}

          {/* Custom Filters Section */}
          <ListSubheader disableSticky component="div" sx={(theme) => sectionHeaderSx(theme, { density: 'regular' })}>
            Custom Filters
          </ListSubheader>

          {/* Custom Filters List */}
          {customFilters.map((filter) => {
            const isSelected = currentValueId === filter.id;
            return (
              <ListItemButton
                key={filter.id}
                selected={isSelected}
                onClick={() => handleSelect(filter.id)}
                sx={(theme) => quickActionButtonSx(theme)}
              >
                <Box sx={(theme) => radioIconSx(theme, isSelected, { inverted: true })}>
                  {isSelected ? <RadioButtonCheckedIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                </Box>
                <Box component="span" sx={{ fontSize: 19, lineHeight: 1, mr: 0.7 }}>{filter.emoji || '📁'}</Box>
                <ListItemText
                  sx={{ ml: 0, flex: 1 }}
                  primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.02rem', color: 'inherit' } }}
                  primary={filter.name}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit(filter);
                  }}
                  sx={{ color: 'inherit', opacity: 0.7, '&:hover': { opacity: 1 }, mr: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(filter);
                  }}
                  sx={{ color: 'inherit', opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemButton>
            );
          })}

          {/* Create New Filter Button */}
          <ListItemButton
            onClick={onOpenEditor}
            sx={(theme) => quickActionButtonSx(theme)}
          >
            <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <AddIcon fontSize="small" />
            </Box>
            <ListItemText
              primary="Create New Filter"
              primaryTypographyProps={{ fontWeight: 700, fontSize: '1.02rem' }}
            />
          </ListItemButton>
        </>
      )}
      {/* No results state */}
      {isFiltering && filteredAllSeries.length === 0 && (
        <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No results</Typography>
        </Box>
      )}
      {showQuickPicks && (
        <>


          {favoritesForSection.length > 0 && (
            <>
              <ListSubheader
                disableSticky
                component="div"
                sx={(theme) => sectionHeaderSx(theme, { density: showQuickPicks ? 'regular' : 'tight' })}
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
                    <Box component="span" sx={{ fontSize: 17, lineHeight: 1, mr: 1 }}>
                      {s.emoji ? s.emoji : '⭐'}
                    </Box>
                    <ListItemText
                      sx={{ ml: 0, flex: 1 }}
                      primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: '0.94rem', lineHeight: 1.05, color: 'inherit' } }}
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
                { density: showQuickPicks || favoritesForSection.length > 0 ? 'regular' : 'tight' }
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
                <Box component="span" sx={{ fontSize: 17, lineHeight: 1, mr: 1 }}>
                  {s.emoji ? s.emoji : s.isFavorite ? '⭐' : '🎬'}
                </Box>
                <ListItemText
                  sx={{ ml: 0, flex: 1 }}
                  primaryTypographyProps={{ sx: { fontWeight: 600, fontSize: '0.94rem', lineHeight: 1.05, color: 'inherit' } }}
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
    ? 'min(560px, calc(100vh - 96px))'
    : 'min(500px, calc(100vh - 96px))';

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
        fullScreen
        PaperProps={{
          sx: (theme) => ({
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'background.default',
          }),
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
    <>
      <Popover
        open={open}
        onClose={onClose}
        anchorEl={anchorEl}
        anchorOrigin={popoverAnchorOrigin}
        transformOrigin={popoverTransformOrigin}
        slotProps={{
          paper: {
            sx: (theme) => ({
              mt: isMobile ? 0.9 : 1,
              width: isMobile ? 'min(360px, calc(100vw - 32px))' : 420,
              maxWidth: isMobile ? 'min(360px, calc(100vw - 32px))' : 'min(420px, calc(100vw - 32px))',
              // On mobile, make it tall enough to be useful but leave room for keyboard
              height: isMobile ? 'min(70vh, 500px)' : 'auto',
              maxHeight: isMobile ? 'min(70vh, 500px)' : desktopMaxHeight,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: isMobile ? theme.spacing(2) : theme.spacing(1.5),
              overflow: 'hidden',
              border: '1px solid',
              borderColor: theme.palette.mode === 'light'
                ? alpha(theme.palette.common.black, 0.12)
                : alpha(theme.palette.common.white, 0.26),
              backgroundImage: theme.palette.mode === 'light'
                ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.99)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`
                : `linear-gradient(180deg, ${alpha(theme.palette.background.default, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.88)} 100%)`,
              boxShadow: isMobile ? theme.shadows[16] : theme.shadows[18],
              backdropFilter: 'blur(18px)',
            }),
          },
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

      <Dialog
        open={deleteConfirmationOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Delete Filter?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <b>{filterToDelete?.title}</b>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
