import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Fab, styled } from '@mui/material';
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

function FloatingActionButtons({ shows, showAd }) {
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

    return (
        <>
            <StyledLeftFooter className="bottomBtn" hasAd={showAd}>
                {hasCollageAccess ? (
                    <StyledButton 
                        onClick={() => navigate('/projects')}
                        startIcon={<Dashboard />} 
                        variant="contained" 
                        style={{ backgroundColor: "black", zIndex: '1300' }}
                    >
                        Projects
                    </StyledButton>
                ) : (
                    // Show original donate + feedback buttons for users without access
                    <>
                        <a href="/support" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                            <Fab color="primary" aria-label="feedback" style={{ margin: "0 10px 0 0", backgroundColor: "black", zIndex: '1300' }} size='medium'>
                                <MapsUgc color="white" />
                            </Fab>
                        </a>
                        <a href="https://memesrc.com/donate" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'none' }}>
                            <Fab color="primary" aria-label="donate" style={{ backgroundColor: "black", zIndex: '1300' }} size='medium'>
                                <Favorite />
                            </Fab>
                        </a>
                    </>
                )}
            </StyledLeftFooter>
            <StyledRightFooter className="bottomBtn" hasAd={showAd}>
                <StyledButton
                    onClick={handleRandomClick}
                    loading={loadingRandom}
                    startIcon={<ShuffleIcon size={22} strokeWidth={2.4} aria-hidden="true" focusable="false" />}
                    variant="contained"
                    style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }}
                >
                    Random
                </StyledButton>
            </StyledRightFooter>
            
        </>
    );
}

FloatingActionButtons.propTypes = {
    shows: PropTypes.array.isRequired,
    showAd: PropTypes.bool.isRequired,
}

export default React.memo(FloatingActionButtons);
