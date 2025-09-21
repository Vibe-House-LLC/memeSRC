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
import StarIcon from '@mui/icons-material/Star';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import TuneIcon from '@mui/icons-material/Tune';
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={isMobile ? undefined : 'md'} fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Select show or movie
        </Typography>
        {currentLabel ? (
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            Current: {currentLabel}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        <List disablePadding sx={{ bgcolor: 'transparent' }}>
          {/* Meaty primary options */}
          <ListItemButton
            selected={currentValueId === '_universal'}
            onClick={() => handleSelect('_universal')}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              mb: 1,
              py: 1.25,
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>🌈</ListItemIcon>
            <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary="All Shows & Movies" />
          </ListItemButton>

          {includeAllFavorites && hasAnyFavorite && (
            <ListItemButton
              selected={currentValueId === '_favorites'}
              onClick={() => handleSelect('_favorites')}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                mb: 1.5,
                py: 1.25,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <StarIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ sx: { fontWeight: 600 } }} primary="All Favorites" />
            </ListItemButton>
          )}

          {/* Inline filter row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SearchIcon fontSize="small" sx={{ opacity: 0.8 }} />
            <TextField
              inputRef={inputRef}
              variant="standard"
              fullWidth
              placeholder="Type to filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
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

          {/* Favorites area */}
          {filteredFavorites.length > 0 && (
            <Box sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              mb: 2,
              overflow: 'hidden',
            }}>
              <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Favorites</Typography>
              </Box>
              <List dense disablePadding>
                {filteredFavorites.map((s) => (
                  <ListItemButton key={s.id} selected={currentValueId === s.id} onClick={() => handleSelect(s.id)} sx={{ py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FavoriteBorderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={`${s.emoji ? `${s.emoji} ` : ''}${s.title}`} />
                  </ListItemButton>
                ))}
              </List>
              {includeEditFavorites && (hasAnyFavorite || includeEditFavorites) && (
                <Box sx={{ px: 2, py: 0.5 }}>
                  <ListItemButton onClick={() => handleSelect('editFavorites')} sx={{ py: 0.75 }}>
                    <ListItemIcon sx={{ minWidth: 36, opacity: 0.75 }}>
                      <TuneIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ sx: { fontSize: 13, opacity: 0.8 } }} primary="Edit favorites" />
                  </ListItemButton>
                </Box>
              )}
            </Box>
          )}

          {/* Full list area */}
          {filteredOthers.length > 0 && (
            <>
              <ListSubheader disableSticky sx={{ px: 0, mb: 0.5 }}>Full List</ListSubheader>
              <List dense disablePadding>
                {filteredOthers.map((s) => (
                  <ListItemButton key={s.id} selected={currentValueId === s.id} onClick={() => handleSelect(s.id)} sx={{ borderRadius: 1, py: 1 }}>
                    <ListItemText primary={`${s.emoji ? `${s.emoji} ` : ''}${s.title}`} />
                  </ListItemButton>
                ))}
              </List>
            </>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}


