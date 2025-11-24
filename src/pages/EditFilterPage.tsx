import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { alpha } from '@mui/material/styles';
import { useSearchFilterGroups } from '../hooks/useSearchFilterGroups';
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
    const location = useLocation();
    const { filterId } = useParams();
    const { groups, createGroup, updateGroup, loading } = useSearchFilterGroups();
    const { shows, user } = useContext(UserContext);

    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('📁');
    const [colorMain, setColorMain] = useState('#000000');
    const [colorSecondary, setColorSecondary] = useState('#FFFFFF');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [filterQuery, setFilterQuery] = useState('');
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [pendingFilterId, setPendingFilterId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);


    // Load state from URL query params (for restoring state after login)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const paramName = params.get('name');
        const paramEmoji = params.get('emoji');
        const paramColorMain = params.get('colorMain');
        const paramColorSecondary = params.get('colorSecondary');
        const paramItems = params.get('items');

        if (paramName) setName(paramName);
        if (paramEmoji) setEmoji(paramEmoji);
        if (paramColorMain) setColorMain(paramColorMain);
        if (paramColorSecondary) setColorSecondary(paramColorSecondary);
        if (paramItems) {
            try {
                const items = JSON.parse(paramItems);
                if (Array.isArray(items)) {
                    setSelectedItems(new Set(items));
                }
            } catch (e) {
                console.error("Failed to parse items from query params", e);
            }
        }
    }, [location.search]);

    // Load existing filter data
    useEffect(() => {
        if (filterId && groups.length > 0) {
            const existingFilter = groups.find(g => g.id === filterId);
            if (existingFilter) {
                setName(existingFilter.name);
                try {
                    const parsedFilters = JSON.parse(existingFilter.filters);
                    setEmoji(parsedFilters.emoji || '📁');
                    setColorMain(parsedFilters.colorMain || '#000000');
                    setColorSecondary(parsedFilters.colorSecondary || '#FFFFFF');
                    setSelectedItems(new Set(parsedFilters.items || []));
                } catch (e) {
                    console.error("Failed to parse filter data", e);
                }
            } else if (!loading) {
                navigate('/search');
            }
        }
    }, [filterId, groups, loading, navigate]);

    // Reset for new filter
    useEffect(() => {
        if (!filterId) {
            // Check if we have params that should take precedence
            const params = new URLSearchParams(location.search);
            if (params.get('name') || params.get('items')) {
                return;
            }

            setName('');
            setEmoji('📁');
            setColorMain('#000000');
            setColorSecondary('#FFFFFF');
            setSelectedItems(new Set());
        }
    }, [filterId, location.search]);

    const handleSave = async () => {
        if (!name.trim()) return;

        if (!user) {
            const params = new URLSearchParams();
            params.set('name', name);
            params.set('emoji', emoji);
            params.set('colorMain', colorMain);
            params.set('colorSecondary', colorSecondary);
            params.set('items', JSON.stringify(Array.from(selectedItems)));

            const currentPath = location.pathname;
            const destinationUrl = `${currentPath}?${params.toString()}`;
            navigate(`/login?dest=${encodeURIComponent(destinationUrl)}`);
            return;
        }

        setIsSaving(true);

        const filterData = {
            items: Array.from(selectedItems),
            emoji,
            colorMain,
            colorSecondary
        };

        try {
            if (filterId) {
                await updateGroup(filterId, name, filterData);
                navigate(`/${filterId}`);
            } else {
                const newFilter = await createGroup(name, filterData);
                if (newFilter) {
                    setPendingFilterId(newFilter.id);
                    setSaveDialogOpen(true);
                }
            }
        } catch (error) {
            console.error("Failed to save filter", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDialogClose = (shouldSwitch) => {
        setSaveDialogOpen(false);
        if (shouldSwitch && pendingFilterId) {
            navigate(`/${pendingFilterId}`);
        } else {
            navigate(-1);
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
                <Toolbar sx={{ justifyContent: 'space-between', minHeight: 72 }}>
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
                            borderRadius: 50,
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 4,
                            py: 1,
                            boxShadow: theme.shadows[4],
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        }}
                    >
                        Save
                    </Button>
                </Toolbar>
            </AppBar>



            <Container maxWidth="md" sx={{ mt: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                    {/* Identity Section */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Box
                                sx={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    bgcolor: 'background.paper',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '4rem',
                                    boxShadow: theme.shadows[4],
                                    border: '4px solid',
                                    borderColor: 'background.paper',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(1.05)' }
                                }}
                            >
                                {emoji}
                                <input
                                    type="text"
                                    value={emoji}
                                    onChange={(e) => setEmoji(e.target.value)}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer'
                                    }}
                                    maxLength={2}
                                />
                            </Box>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid',
                                    borderColor: 'background.default'
                                }}
                            >
                                <Typography variant="caption" fontWeight={700}>Aa</Typography>
                            </Box>
                        </Box>

                        <TextField
                            placeholder="Name your filter"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            variant="standard"
                            fullWidth
                            inputProps={{
                                style: {
                                    textAlign: 'center',
                                    fontSize: '2.5rem',
                                    fontWeight: 800,
                                    paddingBottom: 16
                                }
                            }}
                            sx={{
                                maxWidth: 500,
                                '& .MuiInput-underline:before': { borderBottom: '2px solid', borderColor: 'divider' },
                                '& .MuiInput-underline:after': { borderBottom: '3px solid', borderColor: 'primary.main' }
                            }}
                        />
                    </Box>

                    {/* Appearance Section */}
                    <Box>
                        <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
                            Appearance
                        </Typography>
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        height: '100%'
                                    }}
                                >
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 3, textTransform: 'uppercase' }}>
                                        Colors
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Box sx={{ position: 'relative', width: 80, height: 80, mb: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        bgcolor: colorMain,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        border: '2px solid',
                                                        borderColor: 'background.paper'
                                                    }}
                                                />
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
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="caption" fontWeight={600} color="text.secondary">Background</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Box sx={{ position: 'relative', width: 80, height: 80, mb: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        bgcolor: colorSecondary,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        border: '2px solid',
                                                        borderColor: 'background.paper'
                                                    }}
                                                />
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
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            </Box>
                                            <Typography variant="caption" fontWeight={600} color="text.secondary">Text</Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: 4,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'background.paper'
                                    }}
                                >
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 3, textTransform: 'uppercase', alignSelf: 'flex-start' }}>
                                        Preview
                                    </Typography>
                                    <Chip
                                        label={name || 'Filter Name'}
                                        icon={<span style={{ fontSize: '1.2rem' }}>{emoji}</span>}
                                        sx={{
                                            bgcolor: colorMain,
                                            color: colorSecondary,
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            height: 48,
                                            px: 2,
                                            borderRadius: 24,
                                            '& .MuiChip-icon': { color: 'inherit' }
                                        }}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Selection Section */}
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800}>
                                    Included Shows
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {selectedItems.size} selected
                                </Typography>
                            </Box>
                        </Box>

                        <TextField
                            fullWidth
                            placeholder="Search available shows..."
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
                                    borderRadius: 50,
                                    bgcolor: 'background.paper',
                                    boxShadow: theme.shadows[2],
                                    pl: 2,
                                    '& fieldset': { border: 'none' }
                                }
                            }}
                            sx={{ mb: 4 }}
                        />

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
                                                        py: 2,
                                                        px: 3,
                                                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                                        '&.Mui-selected:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) }
                                                    }}
                                                >
                                                    <Box sx={(theme) => radioIconSx(theme, true, { inverted: true })}>
                                                        <CheckIcon color="primary" />
                                                    </Box>
                                                    <ListItemText
                                                        primary={s.title}
                                                        primaryTypographyProps={{ fontWeight: 700, fontSize: '1.1rem' }}
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
                                                py: 2,
                                                px: 3
                                            }}
                                        >
                                            <Box sx={(theme) => radioIconSx(theme, false, { inverted: true })}>
                                                <RadioButtonUncheckedIcon color="action" />
                                            </Box>
                                            <ListItemText
                                                primary={s.title}
                                                primaryTypographyProps={{ fontSize: '1.1rem', fontWeight: 500 }}
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
                    </Box>
                </Box>
            </Container>

            <Dialog
                open={saveDialogOpen}
                onClose={() => handleDialogClose(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Filter Saved!
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Do you want to switch to your new filter "{name}" now?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={() => handleDialogClose(false)}
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                        color="inherit"
                    >
                        No, Go Back
                    </Button>
                    <Button
                        onClick={() => handleDialogClose(true)}
                        variant="contained"
                        autoFocus
                        sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            px: 3
                        }}
                    >
                        Yes, Switch
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
