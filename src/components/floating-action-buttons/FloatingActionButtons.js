import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    styled,
    useTheme,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Input,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Stack,
    Popper,
    Paper,
} from '@mui/material';
import { Dashboard, KeyboardArrowDown, CloudUpload, PhotoLibrary, Search } from '@mui/icons-material';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../UserContext';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import { useSubscribeDialog } from '../../contexts/useSubscribeDialog';

// Define constants for colors and fonts
const BUTTON_BASE_COLOR = '#0f0f0f';
const BUTTON_HOVER_COLOR = '#1b1b1b';
const BUTTON_ACTIVE_COLOR = '#080808';
const BUTTON_RIPPLE_COLOR = 'rgba(12, 12, 12, 0.72)';
const FONT_FAMILY = 'Roboto, sans-serif';

// Create a button component
const StyledButton = styled(LoadingButton)(() => ({
    fontFamily: FONT_FAMILY,
    fontSize: '18px',
    color: '#fff',
    backgroundColor: BUTTON_BASE_COLOR,
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    '&:hover': {
        backgroundColor: BUTTON_HOVER_COLOR,
    },
    '&:active': {
        backgroundColor: BUTTON_ACTIVE_COLOR,
    },
    '&.Mui-focusVisible': {
        backgroundColor: BUTTON_HOVER_COLOR,
    },
    '& .MuiTouchRipple-root .MuiTouchRipple-child': {
        backgroundColor: BUTTON_RIPPLE_COLOR,
    },
}));

const StyledLeftFooter = styled('footer')(({ theme, hasAd }) => ({
    bottom: hasAd ? '50px' : '0',
    left: theme.spacing(3),
    lineHeight: 0,
    position: 'fixed',
    padding: theme.spacing(1.25, 0),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1300,
    [theme.breakpoints.up('md')]: {
        left: theme.spacing(6),
    },
}));

const StyledRightFooter = styled('footer')(({ theme, hasAd }) => ({
    bottom: hasAd ? '50px' : '0',
    right: theme.spacing(3),
    lineHeight: 0,
    position: 'fixed',
    padding: theme.spacing(1.25, 0),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1300,
    [theme.breakpoints.up('md')]: {
        right: theme.spacing(6),
    },
}));

function FloatingActionButtons({ shows, showAd, variant = 'fixed' }) {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const theme = useTheme();
    const { openSubscriptionDialog } = useSubscribeDialog();
    const isAdmin = user?.['cognito:groups']?.includes('admins');
    const isPro = user?.userDetails?.magicSubscription === 'true';
    const hasToolAccess = Boolean(isAdmin || isPro);
    const randomButtonRef = useRef(null);
    const randomHelperTimeoutRef = useRef(null);
    const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
    const [uploadChoiceOpen, setUploadChoiceOpen] = useState(false);
    const [pendingUpload, setPendingUpload] = useState(null);
    const [randomHelperOpen, setRandomHelperOpen] = useState(false);
    const fileInputRef = useRef(null);

    const toolsMenuOpen = Boolean(toolsAnchorEl);

    useEffect(() => {
        return () => {
            if (randomHelperTimeoutRef.current) {
                clearTimeout(randomHelperTimeoutRef.current);
            }
        };
    }, []);

    const handleCloseRandomHelper = () => {
        if (randomHelperTimeoutRef.current) {
            clearTimeout(randomHelperTimeoutRef.current);
            randomHelperTimeoutRef.current = null;
        }
        setRandomHelperOpen(false);
    };

    const openRandomHelper = () => {
        setRandomHelperOpen(true);
        if (randomHelperTimeoutRef.current) {
            clearTimeout(randomHelperTimeoutRef.current);
        }
        randomHelperTimeoutRef.current = setTimeout(() => {
            setRandomHelperOpen(false);
            randomHelperTimeoutRef.current = null;
        }, 10000);
    };

    const handleRandomClick = () => {
        openRandomHelper();
        trackUsageEvent('random_button_helper_opened', {
            source: 'FloatingActionButtons',
            shows,
            hasAd: showAd,
        });
    };

    const handleToolsButtonClick = (event) => {
        if (toolsMenuOpen) {
            closeToolsMenu();
            return;
        }
        setToolsAnchorEl(event.currentTarget);
    };

    const closeToolsMenu = () => {
        setToolsAnchorEl(null);
    };

    const resetUploadState = () => {
        setUploadChoiceOpen(false);
        setPendingUpload(null);
        if (fileInputRef.current?.value) {
            fileInputRef.current.value = '';
        }
    };

    const handleRequestProUpsell = () => {
        closeToolsMenu();
        openSubscriptionDialog();
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!hasToolAccess) {
            handleRequestProUpsell();
            return;
        }

        const reader = new FileReader();
        const inputEl = event.target;

        reader.onloadend = () => {
            const base64data = reader.result;
            if (typeof base64data === 'string') {
                setPendingUpload(base64data);
                setUploadChoiceOpen(true);
                if (inputEl?.value) {
                    inputEl.value = '';
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleOpenAdvancedEditor = () => {
        if (!pendingUpload) return;
        navigate('/editor/project/new', { state: { uploadedImage: pendingUpload } });
        resetUploadState();
    };

    const handleOpenMagicEditor = () => {
        if (!pendingUpload) return;
        navigate('/magic', { state: { initialSrc: pendingUpload } });
        resetUploadState();
    };

    const handleCollageClick = () => {
        trackUsageEvent('collage_entry', {
            source: 'FloatingActionButtons',
            destination: '/collage',
            hasAccess: hasToolAccess,
        });
        if (!hasToolAccess) {
            handleRequestProUpsell();
            return;
        }
        navigate('/collage');
    };

    const handleToolSelect = (action) => {
        if (action === 'search') {
            closeToolsMenu();
            navigate('/');
            return;
        }

        if (!hasToolAccess) {
            handleRequestProUpsell();
            return;
        }

        closeToolsMenu();

        if (action === 'upload') {
            fileInputRef.current?.click();
            return;
        }

        if (action === 'collage') {
            handleCollageClick();
        }
    };

    const sharedButtonSx = {
        backgroundColor: BUTTON_BASE_COLOR,
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.15)',
        px: { xs: 1.75, sm: 2.15 },
        py: { xs: 1, sm: 1.12 },
        boxShadow: 'none',
        zIndex: 1300,
        '&:hover': {
            backgroundColor: BUTTON_HOVER_COLOR,
        },
        '&:active': {
            backgroundColor: BUTTON_ACTIVE_COLOR,
        },
        '&.Mui-focusVisible': {
            backgroundColor: BUTTON_HOVER_COLOR,
        },
        '& .MuiTouchRipple-root .MuiTouchRipple-child': {
            backgroundColor: BUTTON_RIPPLE_COLOR,
        },
        '& .MuiButton-startIcon': {
            marginRight: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };

    const randomHelperId = randomHelperOpen ? 'random-helper-popover' : undefined;

    const toolsButton = (
        <StyledButton
            onClick={handleToolsButtonClick}
            startIcon={<Dashboard />}
            endIcon={<KeyboardArrowDown />}
            aria-haspopup="true"
            aria-expanded={toolsMenuOpen ? 'true' : undefined}
            aria-controls="floating-tools-menu"
            variant="contained"
            sx={{
                ...sharedButtonSx,
                minWidth: 0,
            }}
        >
            Tools
        </StyledButton>
    );

    const randomButton = (
        <StyledButton
            ref={randomButtonRef}
            aria-describedby={randomHelperId}
            onClick={handleRandomClick}
            startIcon={<ShuffleIcon size={22} strokeWidth={2.4} aria-hidden="true" focusable="false" />}
            variant="contained"
            sx={{
                ...sharedButtonSx,
            }}
        >
            Random
        </StyledButton>
    );

    const inlineGroupStyles = {
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
    };

    const randomHelperPopover = (
        <Popper
            id={randomHelperId}
            open={Boolean(randomHelperOpen && randomButtonRef.current)}
            anchorEl={randomButtonRef.current}
            placement="top-start"
            sx={{ zIndex: 2000 }}
            modifiers={[
                {
                    name: 'offset',
                    options: {
                        offset: [-10, 14],
                    },
                },
            ]}
        >
            <Paper
                sx={{
                    p: { xs: 1.5, sm: 2 },
                    bgcolor: '#0f0f0f',
                    color: '#fff',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0px 14px 40px rgba(0,0,0,0.45)',
                    width: { xs: 220, sm: 280 },
                    maxWidth: 'calc(100vw - 24px)',
                    zIndex: 2000,
                }}
            >
                <Stack spacing={1.25}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        The random button is now part of the search bar
                    </Typography>
                    <Box
                        component="img"
                        src="/assets/randombutton.png"
                        alt="New random button location in search bar"
                        sx={{
                            width: '100%',
                            borderRadius: 1.5,
                            border: '1px solid rgba(255,255,255,0.1)',
                            objectFit: 'cover',
                            objectPosition: 'center center',
                            alignSelf: 'center',
                            maxHeight: { xs: 140, sm: 180 },
                        }}
                    />
                    <Typography variant="body2" color="rgba(255,255,255,0.72)">
                        Look for the shuffle icon next to search to get a random template.
                    </Typography>
                    <Button
                        onClick={handleCloseRandomHelper}
                        variant="contained"
                        size="small"
                        sx={{ alignSelf: 'flex-end', px: 1.75, minWidth: 'unset' }}
                    >
                        Got it
                    </Button>
                </Stack>
            </Paper>
        </Popper>
    );

    const toolsMenu = (
        <>
            <Menu
                id="floating-tools-menu"
                anchorEl={toolsAnchorEl}
                open={toolsMenuOpen}
                onClose={closeToolsMenu}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        mt: 0,
                        minWidth: 240,
                        bgcolor: BUTTON_BASE_COLOR,
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.15)',
                        '& .MuiListItemIcon-root': {
                            color: 'rgba(255,255,255,0.9)',
                        },
                        '& .MuiListItemText-secondary': {
                            color: 'rgba(255,255,255,0.7)',
                        },
                    },
                }}
            >
                <MenuItem onClick={() => handleToolSelect('upload')}>
                    <ListItemIcon>
                        <CloudUpload fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Upload Image"
                        secondary={hasToolAccess ? 'Open to edit' : 'Pro required'}
                    />
                </MenuItem>
                <MenuItem onClick={() => handleToolSelect('collage')}>
                    <ListItemIcon>
                        <PhotoLibrary fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Create Collage"
                        secondary={hasToolAccess ? 'Build with multiple images' : 'Pro required'}
                    />
                </MenuItem>
                <MenuItem onClick={() => handleToolSelect('search')}>
                    <ListItemIcon>
                        <Search fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary="Search Images"
                        secondary="Go to homepage"
                    />
                </MenuItem>
            </Menu>

            <Input
                type="file"
                inputRef={fileInputRef}
                onChange={handleImageUpload}
                inputProps={{ accept: 'image/png, image/jpeg' }}
                sx={{ display: 'none' }}
            />

            <Dialog
                open={uploadChoiceOpen}
                onClose={resetUploadState}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    Open image in...
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Choose where to edit your uploaded image.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Stack spacing={1.25} sx={{ width: '100%' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleOpenAdvancedEditor}
                        >
                            Advanced Editor
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            onClick={handleOpenMagicEditor}
                        >
                            Magic Editor
                        </Button>
                        <Button onClick={resetUploadState} size="large" color="inherit">
                            Cancel
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>
        </>
    );

    const safeAreaSpacerSx = useMemo(() => {
        const baseHeights = {
            xs: 120,
            sm: 120,
            md: 112,
        };
        const adExtraHeights = {
            xs: 72,
            sm: 64,
            md: 56,
        };

        const resolveHeight = (key) => baseHeights[key] + (showAd ? adExtraHeights[key] : 0);

        return {
            width: '100%',
            flexShrink: 0,
            pointerEvents: 'none',
            height: `${resolveHeight('xs')}px`,
            marginBottom: 'env(safe-area-inset-bottom)',
            [theme.breakpoints.up('sm')]: {
                height: `${resolveHeight('sm')}px`,
            },
            [theme.breakpoints.up('md')]: {
                height: `${resolveHeight('md')}px`,
            },
        };
    }, [showAd, theme]);

    if (variant === 'inline') {
        return (
            <>
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                    }}
                >
                    <Box sx={inlineGroupStyles}>
                        {toolsButton}
                    </Box>
                    <Box sx={inlineGroupStyles}>
                        {randomButton}
                    </Box>
                </Box>
                {toolsMenu}
                {randomHelperPopover}
            </>
        );
    }

    return (
        <>
            <Box aria-hidden sx={safeAreaSpacerSx} />
            <StyledLeftFooter className="bottomBtn" hasAd={showAd}>
                {toolsButton}
            </StyledLeftFooter>
            <StyledRightFooter className="bottomBtn" hasAd={showAd}>
                {randomButton}
            </StyledRightFooter>
            {toolsMenu}
            {randomHelperPopover}
        </>
    );
}

FloatingActionButtons.propTypes = {
    shows: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(
            PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.shape({ id: PropTypes.string }),
            ]),
        ),
    ]).isRequired,
    showAd: PropTypes.bool,
    variant: PropTypes.oneOf(['fixed', 'inline']),
};

FloatingActionButtons.defaultProps = {
    showAd: false,
    variant: 'fixed',
};

export default React.memo(FloatingActionButtons);
