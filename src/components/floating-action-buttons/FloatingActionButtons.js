import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Button,
    styled,
    useTheme,
    Input,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Popover,
    Typography,
    Stack,
    List,
    ListItemButton,
    Chip,
} from '@mui/material';
import { Handyman, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
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
    const randomHelperTimeoutRef = useRef(null);
    const toolsButtonRef = useRef(null);
    const [toolsAnchorEl, setToolsAnchorEl] = useState(null);
    const [pendingUpload, setPendingUpload] = useState(null);
    const [pendingTool, setPendingTool] = useState(null);
    const [randomHelperOpen, setRandomHelperOpen] = useState(false);
    const fileInputRef = useRef(null);

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
        setToolsAnchorEl(event.currentTarget);
        setPendingUpload(null);
        setPendingTool(null);
        if (fileInputRef.current?.value) {
            fileInputRef.current.value = '';
        }
    };

    const handleCloseToolsMenu = () => {
        setToolsAnchorEl(null);
    };

    const resetUploadState = () => {
        setToolsAnchorEl(null);
        setPendingUpload(null);
        setPendingTool(null);
        if (fileInputRef.current?.value) {
            fileInputRef.current.value = '';
        }
    };

    const handleRequestProUpsell = () => {
        resetUploadState();
        openSubscriptionDialog();
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (pendingTool !== 'advanced' && !hasToolAccess) {
            handleRequestProUpsell();
            return;
        }

        const reader = new FileReader();
        const inputEl = event.target;
        const destination = pendingTool;

        reader.onloadend = () => {
            const base64data = reader.result;
            if (typeof base64data === 'string') {
                if (destination === 'advanced') {
                    handleOpenAdvancedEditor(base64data);
                } else if (destination === 'magic') {
                    handleOpenMagicEditor(base64data);
                } else {
                    setPendingUpload(base64data);
                    if (toolsButtonRef.current) {
                        setToolsAnchorEl(toolsButtonRef.current);
                    }
                }
                setPendingTool(null);
                if (inputEl?.value) {
                    inputEl.value = '';
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleOpenAdvancedEditor = (imageData = pendingUpload) => {
        if (!imageData) return;
        navigate('/editor/project/new', { state: { uploadedImage: imageData } });
        resetUploadState();
    };

    const handleOpenMagicEditor = (imageData = pendingUpload) => {
        if (!imageData) return;
        navigate('/magic', { state: { initialSrc: imageData } });
        resetUploadState();
    };

    const handleCollageClick = () => {
        trackUsageEvent('collage_entry', {
            source: 'FloatingActionButtons',
            destination: '/projects/new',
            hasAccess: hasToolAccess,
        });
        if (!hasToolAccess) {
            handleRequestProUpsell();
            return;
        }
        resetUploadState();
        navigate('/projects/new', { state: { startInLibrary: true } });
    };

    const handleToolSelect = (action) => {
        if (action === 'collage') {
            handleCollageClick();
            return;
        }

        if (action === 'magic') {
            if (!hasToolAccess) {
                handleRequestProUpsell();
                return;
            }
            resetUploadState();
            navigate('/magic');
            return;
        }

        setPendingTool(action);
        setPendingUpload(null);
        handleCloseToolsMenu();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
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

    const randomHelperId = 'random-helper-dialog';
    const toolsMenuOpen = Boolean(toolsAnchorEl);
    const toolsMenuId = toolsMenuOpen ? 'tools-menu' : undefined;
    const toolsArrowIcon = toolsMenuOpen ? (
        <KeyboardArrowDown fontSize="small" aria-hidden="true" />
    ) : (
        <KeyboardArrowUp fontSize="small" aria-hidden="true" />
    );
    const toolItemSx = {
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
        alignItems: 'flex-start',
        textAlign: 'left',
        gap: 2,
        border: '1px solid transparent',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
        '&:hover': {
            borderColor: theme.palette.divider,
            backgroundColor: theme.palette.action.hover,
        },
        '&:focus-visible': {
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.action.focus,
        },
    };
    const proChipSx = {
        height: 22,
        fontWeight: 700,
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: theme.palette.mode === 'dark' ? '#e3d1ff' : '#4c2c73',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(227, 209, 255, 0.45)' : 'rgba(76, 44, 115, 0.4)',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(107, 66, 161, 0.2)' : 'rgba(107, 66, 161, 0.1)',
    };
    const toolOptions = [
        {
            action: 'advanced',
            label: 'Caption Tool',
            description: 'Add text to your image.',
        },
        {
            action: 'magic',
            label: 'Magic Editor',
            description: 'Edit your image with prompts.',
            isPro: true,
        },
        {
            action: 'collage',
            label: 'Collage Tool',
            description: 'Create a collage from your images.',
            isPro: true,
        },
    ];

    const toolsButton = (
        <StyledButton
            onClick={handleToolsButtonClick}
            startIcon={<Handyman />}
            endIcon={toolsArrowIcon}
            ref={toolsButtonRef}
            aria-haspopup="menu"
            aria-expanded={toolsMenuOpen ? 'true' : undefined}
            aria-controls={toolsMenuOpen ? toolsMenuId : undefined}
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
            aria-haspopup="dialog"
            aria-expanded={randomHelperOpen ? 'true' : undefined}
            aria-controls={randomHelperOpen ? randomHelperId : undefined}
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

    const randomHelperDialog = (
        <Dialog
            id={randomHelperId}
            open={randomHelperOpen}
            onClose={handleCloseRandomHelper}
            maxWidth="xs"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 3,
                },
            }}
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: { xs: '1.15rem', sm: '1.25rem' },
                }}
            >
                The random button is moving.
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
                <Box
                    component="img"
                    src="/assets/randombutton.png"
                    alt="Random button location"
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        border: '1px solid rgba(0,0,0,0.08)',
                        objectFit: 'cover',
                        objectPosition: 'center center',
                        maxHeight: { xs: 180, sm: 220 },
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
                <Button onClick={handleCloseRandomHelper} variant="contained" fullWidth>
                    Got it
                </Button>
            </DialogActions>
        </Dialog>
    );

    const toolsPopover = (
        <>
            <Input
                type="file"
                inputRef={fileInputRef}
                onChange={handleImageUpload}
                inputProps={{ accept: 'image/png, image/jpeg' }}
                sx={{ display: 'none' }}
            />

            <Popover
                id={toolsMenuId}
                open={toolsMenuOpen}
                anchorEl={toolsAnchorEl}
                onClose={resetUploadState}
                anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1.5,
                        minWidth: 260,
                        maxWidth: 320,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
                        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))',
                    },
                }}
            >
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {toolOptions.map((tool) => (
                        <ListItemButton
                            key={tool.action}
                            disableGutters
                            onClick={() => handleToolSelect(tool.action)}
                            sx={toolItemSx}
                        >
                            <Box sx={{ flex: 1 }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {tool.label}
                                    </Typography>
                                    {tool.isPro && <Chip label="Pro" size="small" variant="outlined" sx={proChipSx} />}
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                    {tool.description}
                                </Typography>
                            </Box>
                        </ListItemButton>
                    ))}
                </List>
            </Popover>
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
                {toolsPopover}
                {randomHelperDialog}
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
            {toolsPopover}
            {randomHelperDialog}
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
