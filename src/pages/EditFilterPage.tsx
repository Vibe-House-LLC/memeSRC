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
    Alert,
    Popover
} from '@mui/material';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
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
    const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);

    const handleEmojiClick = (emojiData) => {
        setEmoji(emojiData.emoji);
        setEmojiAnchorEl(null);
    };

    const handleEmojiClose = () => {
        setEmojiAnchorEl(null);
    };

    const isEmojiOpen = Boolean(emojiAnchorEl);
    const emojiId = isEmojiOpen ? 'emoji-popover' : undefined;


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



            <Container maxWidth="xl" sx={{ mt: 4, pb: 8 }}>
                <Grid container spacing={{ xs: 3, md: 6 }}>

                    {/* Left Sidebar: Filter Card (Implicit Editing) */}
                    <Grid item xs={12} md={4}>
                        <Box sx={{
                            position: { md: 'sticky' },
                            top: { md: 100 },
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                        }}>
                            <Typography variant="h6" fontWeight={800} sx={{ opacity: 0.7 }}>
                                Preview & Edit
                            </Typography>

                            <Paper
                                elevation={6}
                                sx={{
                                    position: 'relative',
                                    p: 4,
                                    borderRadius: 6,
                                    bgcolor: colorMain,
                                    color: colorSecondary,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: 400,
                                    transition: 'all 0.3s ease',
                                    overflow: 'hidden',
                                    border: '1px solid',
                                    borderColor: 'divider'
                                }}
                            >
                                {/* Emoji Display (Preview Only) */}
                                <Box sx={{ position: 'relative', mb: 2 }}>
                                    <Box
                                        sx={{
                                            fontSize: '5rem',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'scale(1.1)' },
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
                                            cursor: 'default'
                                        }}
                                    >
                                        {emoji}
                                    </Box>
                                </Box>

                                {/* Name Input */}
                                <TextField
                                    placeholder="Filter Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    variant="standard"
                                    fullWidth
                                    multiline
                                    maxRows={2}
                                    InputProps={{
                                        disableUnderline: true,
                                        sx: {
                                            textAlign: 'center',
                                            fontSize: '2.5rem',
                                            fontWeight: 900,
                                            color: 'inherit',
                                            '& input': {
                                                textAlign: 'center',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            },
                                            '& textarea': {
                                                textAlign: 'center',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }
                                        }
                                    }}
                                    sx={{
                                        '& .MuiInputBase-input::placeholder': {
                                            color: alpha(colorSecondary, 0.5),
                                            opacity: 1
                                        }
                                    }}
                                />

                                {/* Helper Text */}
                                <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.6, fontWeight: 600, display: 'block' }}>
                                    Tap text to edit name
                                </Typography>

                                {/* Control Group (Floating at bottom) */}
                                <Box
                                    sx={{
                                        mt: 6,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: 2,
                                        borderRadius: 4,
                                        bgcolor: 'rgba(0,0,0,0.2)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <SettingsIcon sx={{ color: 'white', fontSize: 16, opacity: 0.8 }} />
                                        <Typography variant="caption" fontWeight={700} sx={{ color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Style
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 4 }}>
                                        {/* Icon Picker */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Box
                                                onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
                                                sx={{
                                                    position: 'relative',
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    bgcolor: 'background.paper',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                    border: '3px solid white',
                                                    transition: 'transform 0.2s',
                                                    '&:hover': { transform: 'scale(1.1)' }
                                                }}
                                            >
                                                {emoji}
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                Icon
                                            </Typography>
                                        </Box>

                                        {/* Background Color Picker */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ position: 'relative', width: 40, height: 40 }}>
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        bgcolor: colorMain,
                                                        border: '3px solid white',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        '&:hover': { transform: 'scale(1.1)' }
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
                                                    title="Change Background Color"
                                                />
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                Background
                                            </Typography>
                                        </Box>

                                        {/* Text Color Picker */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ position: 'relative', width: 40, height: 40 }}>
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        bgcolor: colorSecondary,
                                                        border: '3px solid white',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        '&:hover': { transform: 'scale(1.1)' }
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
                                                    title="Change Text Color"
                                                />
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                Text
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Paper>

                            {/* Emoji Popover (kept outside to avoid clipping) */}
                            <Popover
                                id={emojiId}
                                open={isEmojiOpen}
                                anchorEl={emojiAnchorEl}
                                onClose={handleEmojiClose}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'center',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'center',
                                }}
                                sx={{
                                    '& .MuiPaper-root': {
                                        borderRadius: 4,
                                        boxShadow: theme.shadows[8],
                                        border: '1px solid',
                                        borderColor: 'divider'
                                    }
                                }}
                            >
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    theme={theme.palette.mode === 'dark' ? Theme.DARK : Theme.LIGHT}
                                    lazyLoadEmojis={true}
                                />
                            </Popover>
                        </Box>
                    </Grid>

                    {/* Right Content: Selection List */}
                    <Grid item xs={12} md={8}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                <Box>
                                    <Typography variant="h5" fontWeight={800} gutterBottom>
                                        Included Shows
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        Select the shows you want to include in this filter.
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`${selectedItems.size} Selected`}
                                    color="primary"
                                    sx={{ fontWeight: 700 }}
                                />
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
                                    <ListSubheader sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9), backdropFilter: 'blur(8px)', fontWeight: 700, lineHeight: '48px' }}>
                                        Selected
                                    </ListSubheader>
                                    {selectedItems.size === 0 ? (
                                        <ListItemButton disabled sx={{ py: 2, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                                            <Box sx={(theme) => ({ ...radioIconSx(theme, false, { inverted: true }), opacity: 0 })}>
                                                <CheckIcon />
                                            </Box>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Typography sx={{ fontSize: '1.5rem', lineHeight: 1, opacity: 0 }}>📁</Typography>
                                                        <Typography sx={{ fontStyle: 'italic', color: 'text.secondary' }}>No shows selected</Typography>
                                                    </Box>
                                                }
                                                primaryTypographyProps={{ fontSize: '1.1rem' }}
                                                sx={{ ml: 2 }}
                                            />
                                        </ListItemButton>
                                    ) : (
                                        shows
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
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                                <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{s.emoji}</Typography>
                                                                {s.title}
                                                            </Box>
                                                        }
                                                        primaryTypographyProps={{ fontWeight: 700, fontSize: '1.1rem' }}
                                                        sx={{ ml: 2 }}
                                                    />
                                                </ListItemButton>
                                            ))
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
                                                    primary={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{s.emoji}</Typography>
                                                            {s.title}
                                                        </Box>
                                                    }
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
                    </Grid>
                </Grid>
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
