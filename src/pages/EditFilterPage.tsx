import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
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
    Paper,
    Chip,
    Container,
    AppBar,
    Toolbar,
    Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { alpha } from '@mui/material/styles';
import { useCustomFilters } from '../hooks/useCustomFilters';
import { UserContext } from '../UserContext';

const radioIconSx = (theme, selected, options) => {
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

export default function EditFilterPage() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { filterId } = useParams();
    const { customFilters, addFilter, updateFilter, getFilterById } = useCustomFilters();
    const { shows } = useContext(UserContext);

    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📁');
    const [colorMain, setColorMain] = useState('#000000');
    const [colorSecondary, setColorSecondary] = useState('#FFFFFF');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [filterQuery, setFilterQuery] = useState('');


    // Initialize state
    useEffect(() => {
        if (filterId) {
            const existingFilter = getFilterById(filterId);
            if (existingFilter) {
                setName(existingFilter.name);
                setEmoji(existingFilter.emoji);
                setColorMain(existingFilter.colorMain || '#000000');
                setColorSecondary(existingFilter.colorSecondary || '#FFFFFF');
                setSelectedItems(new Set(existingFilter.items));
            } else {
                // Handle invalid ID? Redirect?
                navigate('/search');
            }
        } else {
            // New filter defaults
            setName('');
            setEmoji('📁');
            setColorMain('#000000');
            setColorSecondary('#FFFFFF');
            setSelectedItems(new Set());
        }
    }, [filterId, getFilterById, navigate]);

    const handleSave = () => {
        if (!name.trim()) return;

        const filterData = {
            name,
            items: Array.from(selectedItems),
            emoji,
            colorMain,
            colorSecondary
        };

        if (filterId) {
            updateFilter(filterId, filterData);
            navigate(`/search/${filterId}`);
        } else {
            const newFilter = addFilter(name, Array.from(selectedItems), emoji, colorMain, colorSecondary);
            navigate(`/search/${newFilter.id}`);
        }
    };

    const handleToggleItem = (id) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                setFilterQuery(''); // Clear search on select
            }
            return next;
        });
    };

    const filteredSeries = useMemo(() => {
        return shows.filter(s =>
            !filterQuery || s.title.toLowerCase().includes(filterQuery.toLowerCase())
        ).sort((a, b) => a.title.localeCompare(b.title));
    }, [shows, filterQuery]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
            {/* Header */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: alpha(theme.palette.background.default, 0.8),
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    color: 'text.primary'
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {filterId ? 'Edit Filter' : 'New Filter'}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!name.trim() || selectedItems.size === 0}
                        startIcon={<SaveIcon />}
                        sx={{
                            borderRadius: 8,
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 3,
                            boxShadow: theme.shadows[4]
                        }}
                    >
                        Save
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="md" sx={{ mt: 4 }}>
                {/* Configuration Card */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 4 },
                        borderRadius: 4,
                        mb: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 3, md: 4 } }}>
                        {/* Name & Emoji */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Emoji"
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                variant="filled"
                                sx={{
                                    width: { xs: 80, md: 100 },
                                    '& .MuiFilledInput-root': {
                                        height: '100%', // Match height
                                        fontSize: { xs: '1.5rem', md: '2.5rem' },
                                        textAlign: 'center',
                                        borderRadius: 3,
                                        bgcolor: 'action.hover',
                                        '&:before, &:after': { display: 'none' },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        p: 0
                                    },
                                    '& input': {
                                        textAlign: 'center',
                                        p: 2,
                                        height: 'auto'
                                    },
                                    '& .MuiInputLabel-root': {
                                        display: 'none' // Hide label for cleaner look on emoji, or keep it? User said "Emoji part is way taller".
                                    }
                                }}
                                inputProps={{ maxLength: 2 }}
                            // Remove label to simplify height calc or keep it?
                            // Let's keep label but rely on flex stretch.
                            />
                            <TextField
                                fullWidth
                                placeholder="Filter Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                variant="filled"
                                autoFocus={!filterId}
                                sx={{
                                    '& .MuiFilledInput-root': {
                                        height: '100%', // Match height
                                        borderRadius: 3,
                                        fontSize: { xs: '1rem', md: '1.2rem' },
                                        fontWeight: 600,
                                        bgcolor: 'action.hover',
                                        '&:before, &:after': { display: 'none' },
                                        display: 'flex',
                                        alignItems: 'center'
                                    },
                                    '& input': {
                                        p: 2
                                    }
                                }}
                            />
                        </Box>

                        <Divider />

                        {/* Colors */}
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Appearance
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                                {/* Background Color Card */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                                        }
                                    }}
                                >
                                    <input
                                        type="color"
                                        value={colorMain}
                                        onChange={(e) => setColorMain(e.target.value)}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer',
                                            zIndex: 2
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 3,
                                                bgcolor: colorMain,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="body1" fontWeight={700}>Background</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                {colorMain}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>

                                {/* Text Color Card */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                                        }
                                    }}
                                >
                                    <input
                                        type="color"
                                        value={colorSecondary}
                                        onChange={(e) => setColorSecondary(e.target.value)}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer',
                                            zIndex: 2
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 3,
                                                bgcolor: colorSecondary,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="body1" fontWeight={700}>Text Color</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                {colorSecondary}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Box>
                        </Box>
                    </Box>
                </Paper>

                {/* Selection Section */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" fontWeight={800} gutterBottom>
                        Select Shows
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {selectedItems.size} selected
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="Search shows..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: filterQuery ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setFilterQuery('')}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                            sx: {
                                borderRadius: 4,
                                bgcolor: 'background.paper',
                                boxShadow: theme.shadows[1],
                                '& fieldset': { border: 'none' }
                            }
                        }}
                    />
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}
                >
                    <List sx={{ p: 0 }}>
                        {selectedItems.size > 0 && (
                            <>
                                <ListSubheader sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), backdropFilter: 'blur(8px)', fontWeight: 700, lineHeight: '48px' }}>
                                    Selected
                                </ListSubheader>
                                {shows
                                    .filter(s => selectedItems.has(s.id))
                                    .map(s => (
                                        <ListItemButton
                                            key={s.id}
                                            onClick={() => handleToggleItem(s.id)}
                                            selected
                                            sx={{
                                                borderBottom: '1px solid',
                                                borderColor: 'divider',
                                                py: 1.5,
                                                '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                                '&.Mui-selected:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                                            }}
                                        >
                                            <Box sx={(theme) => radioIconSx(theme, true, { inverted: true })}>
                                                <CheckIcon color="primary" />
                                            </Box>
                                            <ListItemText
                                                primary={s.title}
                                                primaryTypographyProps={{ fontWeight: 600, fontSize: '1rem' }}
                                                sx={{ ml: 2 }}
                                            />
                                        </ListItemButton>
                                    ))
                                }
                            </>
                        )}

                        <ListSubheader sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), backdropFilter: 'blur(8px)', fontWeight: 700, lineHeight: '48px' }}>
                            {filterQuery ? 'Search Results' : 'All Shows'}
                        </ListSubheader>

                        {filteredSeries.map(s => {
                            if (selectedItems.has(s.id)) return null;
                            return (
                                <ListItemButton
                                    key={s.id}
                                    onClick={() => handleToggleItem(s.id)}
                                    sx={{
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        py: 1.5
                                    }}
                                >
                                    <Box sx={(theme) => radioIconSx(theme, false, { inverted: true })}>
                                        <RadioButtonUncheckedIcon color="action" />
                                    </Box>
                                    <ListItemText
                                        primary={s.title}
                                        primaryTypographyProps={{ fontSize: '1rem' }}
                                        sx={{ ml: 2 }}
                                    />
                                </ListItemButton>
                            );
                        })}

                        {filteredSeries.length === 0 && (
                            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                                <SearchIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                                <Typography variant="body1">No shows found matching "{filterQuery}"</Typography>
                            </Box>
                        )}
                    </List>
                </Paper>
            </Container>
        </Box>
    );
}
