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
                position="static"
                elevation={0}
                sx={{
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
                        {filterId ? 'Edit Filter' : 'New Filter'}
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                        disabled={!name.trim() || selectedItems.size === 0}
                        startIcon={<SaveIcon />}
                        sx={{
                            borderRadius: 20,
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 3
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
                    variant="outlined"
                    sx={{
                        p: 3,
                        borderRadius: 4,
                        mb: 4,
                        bgcolor: 'background.paper'
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Icon"
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                variant="outlined"
                                sx={{ width: 80 }}
                                inputProps={{
                                    maxLength: 2,
                                    style: { textAlign: 'center', fontSize: '1.5rem', cursor: 'pointer' }
                                }}
                            />
                            <TextField
                                fullWidth
                                label="Filter Name"
                                placeholder="e.g., My Comedy Mix"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                variant="outlined"
                                InputProps={{
                                    sx: { fontSize: '1.2rem', fontWeight: 600 }
                                }}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            bgcolor: colorMain,
                                            border: '2px solid',
                                            borderColor: 'divider',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            boxShadow: 2
                                        }}
                                    >
                                        <input
                                            type="color"
                                            value={colorMain}
                                            onChange={(e) => setColorMain(e.target.value)}
                                            style={{ position: 'absolute', top: -10, left: -10, width: 70, height: 70, opacity: 0, cursor: 'pointer' }}
                                        />
                                    </Box>
                                    <Typography variant="body2" fontWeight={600}>Background</Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            bgcolor: colorSecondary,
                                            border: '2px solid',
                                            borderColor: 'divider',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            boxShadow: 2
                                        }}
                                    >
                                        <input
                                            type="color"
                                            value={colorSecondary}
                                            onChange={(e) => setColorSecondary(e.target.value)}
                                            style={{ position: 'absolute', top: -10, left: -10, width: 70, height: 70, opacity: 0, cursor: 'pointer' }}
                                        />
                                    </Box>
                                    <Typography variant="body2" fontWeight={600}>Text Color</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Paper>

                {/* Selection Section */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Select Shows ({selectedItems.size})
                    </Typography>
                    <TextField
                        fullWidth
                        placeholder="Search shows to add..."
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
                            sx: { borderRadius: 3, bgcolor: 'background.paper' }
                        }}
                    />
                </Box>

                <Paper elevation={0} variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'background.paper' }}>
                    <List sx={{ p: 0 }}>
                        {selectedItems.size > 0 && (
                            <>
                                <ListSubheader sx={{ bgcolor: 'background.paper', fontWeight: 700 }}>
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
                                                '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                                            }}
                                        >
                                            <Box sx={(theme) => radioIconSx(theme, true, { inverted: true })}>
                                                <CheckIcon color="primary" />
                                            </Box>
                                            <ListItemText
                                                primary={s.title}
                                                primaryTypographyProps={{ fontWeight: 600 }}
                                                sx={{ ml: 2 }}
                                            />
                                        </ListItemButton>
                                    ))
                                }
                                <Divider />
                            </>
                        )}

                        <ListSubheader sx={{ bgcolor: 'background.paper', fontWeight: 700 }}>
                            {filterQuery ? 'Search Results' : 'All Shows'}
                        </ListSubheader>

                        {filteredSeries.map(s => {
                            if (selectedItems.has(s.id)) return null;
                            return (
                                <ListItemButton
                                    key={s.id}
                                    onClick={() => handleToggleItem(s.id)}
                                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                                >
                                    <Box sx={(theme) => radioIconSx(theme, false, { inverted: true })}>
                                        <RadioButtonUncheckedIcon color="action" />
                                    </Box>
                                    <ListItemText primary={s.title} sx={{ ml: 2 }} />
                                </ListItemButton>
                            );
                        })}

                        {filteredSeries.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography variant="body2">No results found</Typography>
                            </Box>
                        )}
                    </List>
                </Paper>
            </Container>

            {/* Floating Action Button for Mobile Save (Optional, if header button is not enough) */}
            {/* <Fab color="primary" aria-label="save" sx={{ position: 'fixed', bottom: 16, right: 16 }}>
                <SaveIcon />
            </Fab> */}
        </Box>
    );
}
