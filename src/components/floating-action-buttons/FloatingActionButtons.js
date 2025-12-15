import React, { useContext, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    styled,
    CircularProgress,
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
} from '@mui/material';
import { Dashboard, KeyboardArrowDown, CloudUpload, PhotoLibrary, Search } from '@mui/icons-material';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useNavigate } from 'react-router-dom';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { UserContext } from '../../UserContext';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import { useAdFreeDecember } from '../../contexts/AdFreeDecemberContext';
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
    const { loadRandomFrame, loadingRandom } = useLoadRandomFrame();
    const navigate = useNavigate();
    const { user, shows: availableShows = [] } = useContext(UserContext);
    const theme = useTheme();
    const { triggerDialog } = useAdFreeDecember();
    const { openSubscriptionDialog } = useSubscribeDialog();
    const isAdmin = user?.['cognito:groups']?.includes('admins');
    const isPro = user?.userDetails?.magicSubscription === 'true';
    const hasToolAccess = Boolean(isAdmin || isPro);
    const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
    const [uploadChoiceOpen, setUploadChoiceOpen] = useState(false);
    const [pendingUpload, setPendingUpload] = useState(null);
    const fileInputRef = useRef(null);

    const showCount = useMemo(() => {
        if (Array.isArray(shows)) {
            return shows.length;
        }

        if (shows === '_favorites') {
            return availableShows.filter(singleShow => singleShow?.isFavorite).length;
        }

        if (!shows || shows === '_universal') {
            return availableShows.length;
        }

        return availableShows.some(singleShow => singleShow?.id === shows) ? 1 : 0;
    }, [shows, availableShows]);

    const targetShow = useMemo(() => {
        if (Array.isArray(shows)) {
            const [firstShow] = shows;

            if (!firstShow) {
                return undefined;
            }

            if (typeof firstShow === 'string') {
                return firstShow;
            }

            if (typeof firstShow === 'object' && 'id' in firstShow) {
                return firstShow.id;
            }

            return undefined;
        }

        return shows;
    }, [shows]);

    const toolsMenuOpen = Boolean(toolsAnchorEl);

    const handleRandomClick = () => {
        const payload = {
            source: 'FloatingActionButtons',
            showCount,
            hasAd: showAd,
        };

        trackUsageEvent('random_frame', payload);
        triggerDialog();
        loadRandomFrame(targetShow);
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
            onClick={handleRandomClick}
            disabled={loadingRandom}
            startIcon={
                loadingRandom ? (
                    <CircularProgress size={22} thickness={4} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                ) : (
                    <ShuffleIcon size={22} strokeWidth={2.4} aria-hidden="true" focusable="false" />
                )
            }
            variant="contained"
            sx={{
                ...sharedButtonSx,
                '&.Mui-disabled': {
                    backgroundColor: BUTTON_BASE_COLOR,
                    color: 'rgba(255,255,255,0.7)',
                },
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
