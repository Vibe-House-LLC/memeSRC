import React, { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, styled, CircularProgress, useTheme } from '@mui/material';
import { Dashboard } from '@mui/icons-material';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useNavigate } from 'react-router-dom';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { UserContext } from '../../UserContext';
import { trackUsageEvent } from '../../utils/trackUsageEvent';

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

    // Check if user is an admin
    const hasCollageAccess = user?.['cognito:groups']?.includes('admins');

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

    const handleRandomClick = () => {
        const payload = {
            source: 'FloatingActionButtons',
            showCount,
            hasAd: showAd,
        };

        trackUsageEvent('random_frame', payload);
        loadRandomFrame(targetShow);
    };

    const handleCollageClick = () => {
        const destination = hasCollageAccess ? '/projects' : '/pro';
        trackUsageEvent('collage_entry', {
            source: 'FloatingActionButtons',
            destination,
            hasAccess: hasCollageAccess,
        });
        navigate(destination);
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

    const collageButton = (
        <StyledButton
            onClick={handleCollageClick}
            startIcon={<Dashboard />}
            variant="contained"
            sx={{
                ...sharedButtonSx,
            }}
        >
            Collage
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
                    {collageButton}
                </Box>
                <Box sx={inlineGroupStyles}>
                    {randomButton}
                </Box>
            </Box>
        );
    }

    return (
        <>
            <Box aria-hidden sx={safeAreaSpacerSx} />
            <StyledLeftFooter className="bottomBtn" hasAd={showAd}>
                {collageButton}
            </StyledLeftFooter>
            <StyledRightFooter className="bottomBtn" hasAd={showAd}>
                {randomButton}
            </StyledRightFooter>
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
