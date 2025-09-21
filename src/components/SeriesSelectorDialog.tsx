import React, { useEffect, useMemo, useRef, useState } from 'react';
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

export default function SeriesSelectorDialog(props: SeriesSelectorDialogProps) {
  const { open, onClose, onSelect, shows, savedCids, currentValueId, includeEditFavorites = false, includeAllFavorites = true } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filter, setFilter] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Merge shows + savedCids and dedupe by id
  const allSeries: SeriesItem[] = useMemo(() => {
    const map = new Map<string, SeriesItem>();
    [...(shows || []), ...(savedCids || [])].forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [shows, savedCids]);

  const hasAnyFavorite = useMemo(() => allSeries.some((s) => s.isFavorite), [allSeries]);

  const isFiltering = Boolean(filter && filter.trim());

  const filteredFavorites = useMemo(() => {
    if (isFiltering) {
      return allSeries
        .filter((s) => Boolean(s.isFavorite))
        .filter((s) => normalizeString(s.title).includes(normalizeString(filter)));
    }
    return allSeries.filter((s) => Boolean(s.isFavorite));
  }, [allSeries, filter, isFiltering]);

  const filteredOthers = useMemo(() => {
    // Full list should include all, including favorites; keep a separate list for the bottom section
    if (isFiltering) {
      return allSeries.filter((s) => normalizeString(s.title).includes(normalizeString(filter)));
    }
    return allSeries;
  }, [allSeries, filter, isFiltering]);

  const filteredNonFavorites = useMemo(() => {
    return filteredOthers.filter((s) => !s.isFavorite);
  }, [filteredOthers]);

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

  const currentLabel = useMemo(() => {
    if (!currentValueId) return '';
    if (currentValueId === '_universal') return '🌈 All Shows & Movies';
    if (currentValueId === '_favorites') return '⭐ All Favorites';
    const found = allSeries.find((s) => s.id === currentValueId);
    return found ? `${found.emoji ? `${found.emoji} ` : ''}${found.title}` : '';
  }, [currentValueId, allSeries]);

  const currentSeries = useMemo(() => {
    if (!currentValueId || currentValueId === '_universal' || currentValueId === '_favorites') return undefined;
    return allSeries.find((s) => s.id === currentValueId);
  }, [allSeries, currentValueId]);

  const flatVisibleIds = useMemo(() => {
    const ids: string[] = [];
    // Universal always visible when not filtering
    if (!isFiltering) ids.push('_universal');
    if (!isFiltering && includeAllFavorites && hasAnyFavorite) ids.push('_favorites');
    if (!isFiltering && includeEditFavorites && (hasAnyFavorite || includeEditFavorites)) ids.push('editFavorites');
    filteredFavorites.forEach((s) => ids.push(s.id));
    filteredOthers.forEach((s) => ids.push(s.id));
    return ids;
  }, [filteredFavorites, filteredOthers, isFiltering, includeAllFavorites, hasAnyFavorite, includeEditFavorites]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = flatVisibleIds[0];
      if (first) handleSelect(first);
    }
  };

  const showQuickPicks = !isFiltering && !isInputFocused;

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
          {isFiltering && filteredOthers.length === 0 && filteredFavorites.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No results</Typography>
            </Box>
          )}

          {/* Quick picks when not filtering */}
          {showQuickPicks && (
            <>
              <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                Quick Picks
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

              {currentSeries && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <ListSubheader disableSticky component="div" sx={{ bgcolor: 'transparent', px: 0, py: 1, fontSize: '0.95rem', fontWeight: 700, color: 'text.secondary' }}>
                    Current Selection
                  </ListSubheader>
                  <ListItemButton
                    selected={currentValueId === currentSeries.id}
                    onClick={() => handleSelect(currentSeries.id)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      mb: 1,
                      py: 1.25,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {currentSeries.emoji ? (
                        <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{currentSeries.emoji}</Box>
                      ) : (
                        <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{currentSeries.isFavorite ? '⭐' : '🎬'}</Box>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                      primary={currentSeries.title}
                      secondary="Current selection"
                      secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                    />
                  </ListItemButton>
                </>
              )}

              <Divider sx={{ my: 1.5 }} />
            </>
          )}

          {/* Full list */}
          {isFiltering ? (
            <>
              {filteredFavorites.map((s) => (
                <ListItemButton
                  key={s.id}
                  selected={currentValueId === s.id}
                  onClick={() => handleSelect(s.id)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    mb: 1,
                    py: 1.25,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {s.emoji ? (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</Box>
                    ) : (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>⭐</Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary={s.title} />
                  {s.emoji && (
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }} aria-label="Favorited">
                      <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>⭐</Box>
                    </Box>
                  )}
                </ListItemButton>
              ))}

              {filteredNonFavorites.map((s) => (
                <ListItemButton
                  key={s.id}
                  selected={currentValueId === s.id}
                  onClick={() => handleSelect(s.id)}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    mb: 1,
                    py: 1.25,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, opacity: 0.9 }}>
                    {s.emoji ? (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</Box>
                    ) : (
                      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>🎬</Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary={s.title} />
                </ListItemButton>
              ))}
            </>
          ) : (
            [...filteredFavorites, ...filteredNonFavorites].map((s) => (
              <ListItemButton
                key={s.id}
                selected={currentValueId === s.id}
                onClick={() => handleSelect(s.id)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  mb: 1,
                  py: 1.25,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {s.emoji ? (
                    <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</Box>
                  ) : (
                    <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>{s.isFavorite ? '⭐' : '🎬'}</Box>
                  )}
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary={s.title} />
                {s.isFavorite && s.emoji && (
                  <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }} aria-label="Favorited">
                    <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>⭐</Box>
                  </Box>
                )}
              </ListItemButton>
            ))
          )}
        </List>
      </DialogContent>

      
    </Dialog>
  );
}
