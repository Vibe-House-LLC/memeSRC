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
    Typography,
    Stack,
    Divider,
    Badge,
    Chip,
    IconButton,
} from '@mui/material';
import { Close, Dashboard, Handyman, KeyboardArrowUp, LocalPoliceRounded } from '@mui/icons-material';
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
    const [uploadChoiceOpen, setUploadChoiceOpen] = useState(false);
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

    const handleToolsButtonClick = () => {
        setUploadChoiceOpen(true);
        setPendingUpload(null);
        setPendingTool(null);
        if (fileInputRef.current?.value) {
            fileInputRef.current.value = '';
        }
    };

    const resetUploadState = () => {
        setUploadChoiceOpen(false);
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
                    setUploadChoiceOpen(true);
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
            navigate('/magic');
            return;
        }

        setPendingTool(action);
        setPendingUpload(null);
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

    const toolsButton = (
        <StyledButton
            onClick={handleToolsButtonClick}
            startIcon={<Handyman />}
            aria-haspopup="dialog"
            aria-expanded={uploadChoiceOpen ? 'true' : undefined}
            aria-controls={uploadChoiceOpen ? 'upload-choice-dialog' : undefined}
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

    const toolDialog = (
        <>
            <Input
                type="file"
                inputRef={fileInputRef}
                onChange={handleImageUpload}
                inputProps={{ accept: 'image/png, image/jpeg' }}
                sx={{ display: 'none' }}
            />

            <Dialog
                id="upload-choice-dialog"
                open={uploadChoiceOpen}
                onClose={resetUploadState}
                maxWidth="xs"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        borderRadius: 3,
                    },
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <DialogTitle
                        sx={{
                            fontWeight: 800,
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <Handyman fontSize="small" />
                        Tools
                    </DialogTitle>
                    <IconButton onClick={resetUploadState} aria-label="close">
                        <Close />
                    </IconButton>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {/* <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Pick a tool to continue. We will ask for a photo after choosing Advanced or Magic; Collage jumps straight to picking photos.
                    </Typography>
                </DialogContent> */}
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Stack spacing={1.25} sx={{ width: '100%' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => handleToolSelect('advanced')}
                        >
                            Caption Tool
                        </Button>
                        <Typography variant="body2" color="text.secondary" textAlign={'center'} pb={1.5}>
                            Add text to your image.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => handleToolSelect('magic')}
                        >
                            Magic Editor
                            <Badge>
                                <Chip
                                    icon={<LocalPoliceRounded />}
                                    label={'Pro'}
                                    size="small"
                                    sx={{
                                        ml: 1,
                                        background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                                        border: '1px solid #8b5cc7',
                                        boxShadow: '0 0 20px rgba(107,66,161,0.5)',
                                        '& .MuiChip-label': {
                                            fontWeight: 'bold',
                                            color: '#fff',
                                        },
                                        '& .MuiChip-icon': {
                                            color: '#fff',
                                        },
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                                            boxShadow: '0 0 25px rgba(107,66,161,0.6)',
                                        },
                                    }}
                                />
                            </Badge>
                        </Button>
                        <Typography variant="body2" color="text.secondary" textAlign={'center'} pb={1.5}>
                            Edit your image with prompts.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => handleToolSelect('collage')}
                        >
                            Collage Tool
                            <Badge>
                                <Chip
                                    icon={<LocalPoliceRounded />}
                                    label={'Pro'}
                                    size="small"
                                    sx={{
                                        ml: 1,
                                        background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                                        border: '1px solid #8b5cc7',
                                        boxShadow: '0 0 20px rgba(107,66,161,0.5)',
                                        '& .MuiChip-label': {
                                            fontWeight: 'bold',
                                            color: '#fff',
                                        },
                                        '& .MuiChip-icon': {
                                            color: '#fff',
                                        },
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                                            boxShadow: '0 0 25px rgba(107,66,161,0.6)',
                                        },
                                    }}
                                />
                            </Badge>
                        </Button>
                        <Typography variant="body2" color="text.secondary" textAlign={'center'} pb={1.5}>
                            Create a collage from your images.
                        </Typography>
                        <Divider />
                        <Box sx={{ width: '100%', pt: 2 }}>
                            <Button onClick={resetUploadState} size="large" color="error" variant="contained" fullWidth>
                                Cancel
                            </Button>
                        </Box>
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
                {toolDialog}
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
            {toolDialog}
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
