import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    Box,
    TextField,
    Typography,
    Button,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Divider,
    InputAdornment,
    useTheme,
    useMediaQuery,
    Paper,
    Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CheckIcon from '@mui/icons-material/Check';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useCustomFilters } from '../hooks/useCustomFilters';
import { alpha } from '@mui/material/styles';

interface SeriesItem {
    id: string;
    title: string;
    isFavorite?: boolean;
}

interface FilterEditorDialogProps {
    open: boolean;
    onClose: () => void;
    allSeries: SeriesItem[];
}

const radioIconSx = (theme: any, selected: boolean, options?: { inverted?: boolean }) => {
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

export default function FilterEditorDialog({ open, onClose, allSeries }: FilterEditorDialogProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { addFilter } = useCustomFilters();

    const [step, setStep] = useState<'name' | 'selection'>('name');
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📁');
    const [colorMain, setColorMain] = useState('#000000');
    const [colorSecondary, setColorSecondary] = useState('#FFFFFF');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset state on open
    useEffect(() => {
        if (open) {
            setStep('name');
            setName('');
            setEmoji('📁');
            setColorMain('#000000');
            setColorSecondary('#FFFFFF');
            setSelectedItems(new Set());
            setFilter('');
        }
    }, [open]);

    const handleNext = () => {
        if (name.trim()) {
            setStep('selection');
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    };

    const handleBack = () => {
        setStep('name');
    };

    const handleSave = () => {
        if (!name.trim()) return;
        addFilter(name, Array.from(selectedItems), emoji, colorMain, colorSecondary);
        onClose();
    };

    const handleToggleItem = (id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                setFilter(''); // Clear search on select
            }
            return next;
        });
    };

    const filteredSeries = allSeries.filter(s =>
        !filter || s.title.toLowerCase().includes(filter.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));

    const renderNameStep = (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Create Filter
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Give your new collection a name and style.
                </Typography>
            </Box>

            <Box sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                    autoFocus
                    fullWidth
                    variant="outlined"
                    label="Filter Name"
                    placeholder="e.g., My Comedy Mix"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && name.trim()) {
                            handleNext();
                        }
                    }}
                    InputProps={{
                        sx: { fontSize: '1.2rem', fontWeight: 600 }
                    }}
                />

                <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 3, alignItems: 'center', borderRadius: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">ICON</Typography>
                        <TextField
                            value={emoji}
                            onChange={(e) => setEmoji(e.target.value)}
                            variant="standard"
                            InputProps={{
                                disableUnderline: true,
                                sx: { fontSize: '2.5rem', textAlign: 'center', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0 }
                            }}
                            inputProps={{ maxLength: 2, style: { textAlign: 'center', padding: 0 } }}
                        />
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={600}>Background</Typography>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: colorMain,
                                    border: '2px solid',
                                    borderColor: 'divider',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="color"
                                    value={colorMain}
                                    onChange={(e) => setColorMain(e.target.value)}
                                    style={{ position: 'absolute', top: -10, left: -10, width: 60, height: 60, opacity: 0, cursor: 'pointer' }}
                                />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" fontWeight={600}>Text Color</Typography>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: colorSecondary,
                                    border: '2px solid',
                                    borderColor: 'divider',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="color"
                                    value={colorSecondary}
                                    onChange={(e) => setColorSecondary(e.target.value)}
                                    style={{ position: 'absolute', top: -10, left: -10, width: 60, height: 60, opacity: 0, cursor: 'pointer' }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 400, mt: 'auto' }}>
                <Button
                    size="large"
                    variant="text"
                    onClick={onClose}
                    sx={{ flex: 1, borderRadius: 3, color: 'text.secondary' }}
                >
                    Cancel
                </Button>
                <Button
                    size="large"
                    variant="contained"
                    onClick={handleNext}
                    disabled={!name.trim()}
                    sx={{ flex: 2, borderRadius: 3, boxShadow: 'none', fontWeight: 700 }}
                >
                    Next Step
                </Button>
            </Box>
        </Box>
    );

    const renderSelectionStep = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={handleBack} edge="start">
                    <ChevronLeftIcon />
                </IconButton>
                <TextField
                    inputRef={inputRef}
                    size="small"
                    fullWidth
                    placeholder="Search shows to add..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ opacity: 0.7 }} />
                            </InputAdornment>
                        ),
                        endAdornment: filter ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setFilter('')}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                        sx: { borderRadius: 3 }
                    }}
                />
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={selectedItems.size === 0}
                    sx={{ minWidth: 80, borderRadius: 3, boxShadow: 'none', fontWeight: 700 }}
                >
                    Save
                </Button>
            </Box>

            <List sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
                {selectedItems.size > 0 && (
                    <>
                        <ListSubheader sx={{ bgcolor: 'background.paper', zIndex: 1, fontWeight: 700, fontSize: '0.9rem', mt: 1 }}>
                            Selected ({selectedItems.size})
                        </ListSubheader>
                        {allSeries
                            .filter(s => selectedItems.has(s.id))
                            .map(s => (
                                <ListItemButton
                                    key={s.id}
                                    onClick={() => handleToggleItem(s.id)}
                                    selected
                                    sx={{ borderRadius: 2, mb: 0.5 }}
                                >
                                    <Box sx={(theme) => radioIconSx(theme, true, { inverted: true })}>
                                        <CheckIcon fontSize="small" />
                                    </Box>
                                    <ListItemText primary={s.title} primaryTypographyProps={{ fontWeight: 600 }} sx={{ ml: 1.5 }} />
                                </ListItemButton>
                            ))
                        }
                        <Divider sx={{ my: 2 }} />
                    </>
                )}

                <ListSubheader sx={{ bgcolor: 'background.paper', zIndex: 1, fontWeight: 700, fontSize: '0.9rem' }}>
                    {filter ? 'Search Results' : 'All Shows'}
                </ListSubheader>

                {filteredSeries.map(s => {
                    if (selectedItems.has(s.id)) return null;
                    return (
                        <ListItemButton
                            key={s.id}
                            onClick={() => handleToggleItem(s.id)}
                            sx={{ borderRadius: 2, mb: 0.5 }}
                        >
                            <Box sx={(theme) => radioIconSx(theme, false, { inverted: true })}>
                                <RadioButtonUncheckedIcon fontSize="small" />
                            </Box>
                            <ListItemText primary={s.title} sx={{ ml: 1.5 }} />
                        </ListItemButton>
                    );
                })}

                {filteredSeries.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body2">No results found</Typography>
                    </Box>
                )}
            </List>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    height: isMobile ? '100%' : '600px',
                    maxHeight: '80vh',
                    borderRadius: isMobile ? 0 : 4,
                    overflow: 'hidden'
                }
            }}
        >
            {step === 'name' ? renderNameStep : renderSelectionStep}
        </Dialog>
    );
}
