import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Box, styled, CircularProgress } from '@mui/material';
import { Dashboard } from '@mui/icons-material';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import LoadingButton from '@mui/lab/LoadingButton';
import { useNavigate } from 'react-router-dom';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { UserContext } from '../../UserContext';
import { trackUsageEvent } from '../../utils/trackUsageEvent';

// Define constants for colors and fonts
const FONT_FAMILY = 'Roboto, sans-serif';

// Create a button component
const StyledButton = styled(LoadingButton)(({ theme }) => ({
    fontFamily: FONT_FAMILY,
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.25,
    textTransform: 'none',
    borderRadius: theme.spacing(1.6),
    padding: theme.spacing(1.32, 3.1),
    color: '#f8fafc',
    backgroundColor: '#050505',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'none',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    transition: 'background-color 140ms ease, transform 140ms ease',
    '&:hover': {
        backgroundColor: '#0f0f0f',
        transform: 'translateY(-1px)',
    },
    '&:active': {
        backgroundColor: '#090909',
        transform: 'translateY(0)',
    },
    '&.Mui-disabled': {
        backgroundColor: '#1f1f1f',
        color: 'rgba(248, 250, 252, 0.58)',
    },
    '& .MuiButton-startIcon': {
        marginRight: theme.spacing(1),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    [theme.breakpoints.down('sm')]: {
        fontSize: '0.94rem',
        padding: theme.spacing(1, 2.5),
        borderRadius: theme.spacing(1.2),
        '& .MuiButton-startIcon': {
            marginRight: theme.spacing(0.7),
        },
    },
}));

const FixedActionSlot = styled('footer', {
    shouldForwardProp: (prop) => prop !== 'hasAd' && prop !== 'side',
})(({ theme, hasAd, side }) => ({
    position: 'fixed',
    bottom: hasAd ? '50px' : theme.spacing(1.5),
    left: side === 'left' ? theme.spacing(1.5) : 'auto',
    right: side === 'right' ? theme.spacing(1.5) : 'auto',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'auto',
    zIndex: 1300,
}));

// Removed image drawer/collector UI and helpers

function FloatingActionButtons({ shows, showAd, variant = 'fixed' }) {
    const { loadRandomFrame, loadingRandom } = useLoadRandomFrame();
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    
    // Check if user is an admin
    const hasCollageAccess = user?.['cognito:groups']?.includes('admins');

    const handleRandomClick = () => {
        const payload = {
            source: 'FloatingActionButtons',
            showCount: Array.isArray(shows) ? shows.length : 0,
            hasAd: showAd,
        };

        trackUsageEvent('random_frame', payload);
        loadRandomFrame(shows);
    };

    const buttonSizing = variant === 'inline'
        ? {
            minWidth: { xs: 156, sm: 188 },
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.46)',
        }
        : {
            minWidth: { xs: 148, sm: 176 },
            boxShadow: 'none',
        };

    const handleCollageClick = () => {
        const payload = {
            source: 'FloatingActionButtons',
            destination: hasCollageAccess ? '/projects' : '/pro',
            hasAccess: hasCollageAccess,
        };
        trackUsageEvent('collage_entry', payload);
        navigate(hasCollageAccess ? '/projects' : '/pro');
    };

    const collageButton = (
        <StyledButton
            onClick={handleCollageClick}
            startIcon={<Dashboard />}
            variant="contained"
            sx={{
                ...buttonSizing,
                px: variant === 'inline' ? { xs: 2.6, sm: 3.3 } : { xs: 2.2, sm: 2.8 },
                py: variant === 'inline' ? { xs: 1.18, sm: 1.32 } : { xs: 1, sm: 1.08 },
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
                    <CircularProgress size={22} thickness={4} sx={{ color: 'rgba(248,248,248,0.8)' }} />
                ) : (
                    <ShuffleIcon size={22} strokeWidth={2.4} color="#f8fafc" aria-hidden="true" focusable="false" />
                )
            }
            variant="contained"
            sx={{
                ...buttonSizing,
                px: variant === 'inline' ? { xs: 2.7, sm: 3.4 } : { xs: 2.3, sm: 2.9 },
                py: variant === 'inline' ? { xs: 1.18, sm: 1.32 } : { xs: 1, sm: 1.08 },
                '&.Mui-disabled': {
                    color: 'rgba(248,250,252,0.58)',
                },
            }}
        >
            Random
        </StyledButton>
    );

    const primaryActions = collageButton;
    const buildInlineGroupStyles = (justifyContent) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent,
        flex: '1 1 0',
        minWidth: 0,
        gap: 1.4,
    });

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
                <Box sx={buildInlineGroupStyles('flex-start')}>
                    {primaryActions}
                </Box>
                <Box sx={buildInlineGroupStyles('flex-end')}>
                    {randomButton}
                </Box>
            </Box>
        );
    }

    return (
        <>
            <FixedActionSlot side="left" hasAd={showAd}>
                {primaryActions}
            </FixedActionSlot>
            <FixedActionSlot side="right" hasAd={showAd}>
                {randomButton}
            </FixedActionSlot>
        </>
    );
}

FloatingActionButtons.propTypes = {
    shows: PropTypes.oneOfType([PropTypes.array, PropTypes.string]).isRequired,
    showAd: PropTypes.bool,
    variant: PropTypes.oneOf(['fixed', 'inline']),
}

FloatingActionButtons.defaultProps = {
    showAd: false,
    variant: 'fixed',
};

export default React.memo(FloatingActionButtons);
