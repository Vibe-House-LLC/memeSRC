import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Fab, styled } from '@mui/material';
import { MapsUgc, Favorite, Dashboard } from '@mui/icons-material';
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

    const projectsButton = (
        <StyledButton
            onClick={() => navigate('/projects')}
            startIcon={<Dashboard />}
            variant="contained"
            sx={{
                backgroundColor: 'black',
                '&:hover': {
                    backgroundColor: 'black',
                },
                boxShadow: variant === 'inline' ? '0 8px 16px rgba(0,0,0,0.3)' : undefined,
                borderRadius: variant === 'inline' ? 2 : undefined,
                px: variant === 'inline' ? 2.5 : undefined,
                py: variant === 'inline' ? 1 : undefined,
                zIndex: 1300,
            }}
        >
            Projects
        </StyledButton>
    );

    const supportButtons = (
        <>
            <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                <Fab
                    color="primary"
                    aria-label="feedback"
                    size="medium"
                    sx={{
                        mr: variant === 'inline' ? 0.5 : 1.25,
                        backgroundColor: 'black',
                        '&:hover': {
                            backgroundColor: 'black',
                        },
                        zIndex: 1300,
                        boxShadow: variant === 'inline' ? '0 8px 16px rgba(0,0,0,0.3)' : undefined,
                    }}
                >
                    <MapsUgc color="white" />
                </Fab>
            </a>
            <a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                <Fab
                    color="primary"
                    aria-label="donate"
                    size="medium"
                    sx={{
                        backgroundColor: 'black',
                        '&:hover': {
                            backgroundColor: 'black',
                        },
                        zIndex: 1300,
                        boxShadow: variant === 'inline' ? '0 8px 16px rgba(0,0,0,0.3)' : undefined,
                    }}
                >
                    <Favorite />
                </Fab>
            </a>
        </>
    );

    const randomButton = (
        <StyledButton
            onClick={handleRandomClick}
            loading={loadingRandom}
            startIcon={<ShuffleIcon size={22} strokeWidth={2.4} aria-hidden="true" focusable="false" />}
            variant="contained"
            sx={{
                backgroundColor: 'black',
                '&:hover': {
                    backgroundColor: 'black',
                },
                ml: variant === 'inline' ? 0 : 'auto',
                borderRadius: variant === 'inline' ? 2 : undefined,
                px: variant === 'inline' ? 2.75 : undefined,
                py: variant === 'inline' ? 1 : undefined,
                boxShadow: variant === 'inline' ? '0 8px 16px rgba(0,0,0,0.3)' : undefined,
                zIndex: 1300,
            }}
        >
            Random
        </StyledButton>
    );

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {hasCollageAccess ? projectsButton : supportButtons}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {randomButton}
                </Box>
            </Box>
        );
    }

    return (
        <>
            <StyledLeftFooter className="bottomBtn" hasAd={showAd}>
                {hasCollageAccess ? projectsButton : supportButtons}
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
}

FloatingActionButtons.defaultProps = {
    showAd: false,
    variant: 'fixed',
};

export default React.memo(FloatingActionButtons);
