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
const PRIMARY_COLOR = '#4285F4';
const SECONDARY_COLOR = '#0F9D58';
const FONT_FAMILY = 'Roboto, sans-serif';

// Create a button component
const StyledButton = styled(LoadingButton)`
    font-family: ${FONT_FAMILY};
    font-size: 18px;
    color: #fff;
    background-color: ${SECONDARY_COLOR};
    border-radius: 8px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.3s;

    &:hover {
      background-color: ${PRIMARY_COLOR};
    }
`;

const StyledLeftFooter = styled('footer')`
    bottom: ${props => props.hasAd ? '50px' : '0'};
    left: 0;
    line-height: 0;
    position: fixed;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    z-index: 1300;
`;

const StyledRightFooter = styled('footer')`
    bottom: ${props => props.hasAd ? '50px' : '0'};
    right: 0;
    line-height: 0;
    position: fixed;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    z-index: 1300;
`;

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
        backgroundColor: 'black',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.15)',
        px: { xs: 1.75, sm: 2.15 },
        py: { xs: 1, sm: 1.12 },
        boxShadow: 'none',
        zIndex: 1300,
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
                    backgroundColor: 'black',
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
    shows: PropTypes.oneOfType([PropTypes.array, PropTypes.string]).isRequired,
    showAd: PropTypes.bool,
    variant: PropTypes.oneOf(['fixed', 'inline']),
};

FloatingActionButtons.defaultProps = {
    showAd: false,
    variant: 'fixed',
};

export default React.memo(FloatingActionButtons);
