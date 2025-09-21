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
  const inputRef = useRef<HTMLInputElement>(null);

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

  const filteredFavorites = useMemo(() => {
    return allSeries
      .filter((s) => Boolean(s.isFavorite))
      .filter((s) => !filter || normalizeString(s.title).includes(normalizeString(filter)));
  }, [allSeries, filter]);

  const filteredOthers = useMemo(() => {
    // Full list should include all, including favorites; keep a separate list for the bottom section
    return allSeries.filter((s) => !filter || normalizeString(s.title).includes(normalizeString(filter)));
  }, [allSeries, filter]);

  const isFiltering = Boolean(filter && filter.trim());

  const filteredNonFavorites = useMemo(() => {
    return filteredOthers.filter((s) => !s.isFavorite);
  }, [filteredOthers]);

  useEffect(() => {
    if (open) {
      // Delay to ensure dialog content mounts
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
    return;
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={isMobile ? 'sm' : 'md'}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Select show or movie
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <List disablePadding sx={{ bgcolor: 'transparent' }}>

          {isFiltering ? (
            <>
              {/* Filter input */}
              <Box sx={{ mb: 2 }}>
                <TextField
                  inputRef={inputRef}
                  variant="standard"
                  fullWidth
                  placeholder="Type to filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={handleKeyDown}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ opacity: 0.8 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      filter ? (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" onMouseDown={(e) => e.preventDefault()} onClick={() => setFilter('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    )
                  }}
                />
              </Box>

              {/* Favorites first (big standalone items) */}
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

              {/* Non-favorites next (same big style) */}
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
            <>
              {/* Meaty primary options (bigger) */}
              <ListItemButton
                selected={currentValueId === '_universal'}
                onClick={() => handleSelect('_universal')}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  mb: 1,
                  py: 1.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box component="span" sx={{ fontSize: 22, lineHeight: 1 }}>🌈</Box>
                </ListItemIcon>
                <ListItemText primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.05rem' } }} primary="All Shows & Movies" />
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
                    py: 1.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Box component="span" sx={{ fontSize: 22, lineHeight: 1 }}>⭐</Box>
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '1.05rem' } }} primary="All Favorites" />
                  {includeEditFavorites && (
                    <Box sx={{ ml: 'auto' }}>
                      <IconButton size="small" aria-label="Edit favorites" onClick={(e) => { e.stopPropagation(); handleSelect('editFavorites'); }}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </ListItemButton>
              )}

              {/* Associate filter with the list of all shows */}
              <ListSubheader disableSticky sx={{ px: 0, mb: 0.5, mt: 1 }}>Filter shows</ListSubheader>
              <Box sx={{ mb: 2 }}>
                <TextField
                  inputRef={inputRef}
                  variant="standard"
                  fullWidth
                  placeholder="Type to filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={handleKeyDown}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ opacity: 0.8 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      filter ? (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" onMouseDown={(e) => e.preventDefault()} onClick={() => setFilter('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    )
                  }}
                />
              </Box>

              {/* Unified full list: favorites first, big style */}
              {[...filteredFavorites, ...filteredNonFavorites].map((s) => (
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
              ))}
            </>
          )}
        </List>
      </DialogContent>

      
    </Dialog>
  );
}


