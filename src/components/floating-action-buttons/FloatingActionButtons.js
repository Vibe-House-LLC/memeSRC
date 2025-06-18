import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Fab, Button, styled, Stack, Typography, Box } from '@mui/material';
import { MapsUgc, Favorite, Shuffle, Collections } from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { useCollector } from '../../contexts/CollectorContext';

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

const ImageDrawerPopup = styled('div')`
    position: fixed;
    bottom: ${props => props.hasAd ? '110px' : '70px'};
    left: 0;
    right: 0;
    width: 100%;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.05));
    padding: 20px 16px 16px 16px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1301;
    backdrop-filter: blur(6px);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    animation: slideUpFade 0.4s ease-out forwards;
    
    @keyframes slideUpFade {
        0% {
            transform: translateY(100%);
            opacity: 0;
        }
        100% {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;

export default function FloatingActionButtons({ shows, showAd }) {
    const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
    const { collectedItems, clearAll, removeItem, count } = useCollector();
    const [showImageDrawer, setShowImageDrawer] = useState(false);
    const popupRef = useRef(null);
    const buttonRef = useRef(null);

    console.log('showImageDrawer:', showImageDrawer, 'collectedItems.length:', collectedItems.length);

    // Handle click outside to close popup
    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setShowImageDrawer(false);
            }
        }

        if (showImageDrawer) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showImageDrawer]);

    return (
        <>
            <StyledLeftFooter className="bottomBtn" hasAd={showAd}>
                <Button 
                    ref={buttonRef}
                    aria-label="image drawer" 
                    onClick={() => setShowImageDrawer(!showImageDrawer)}
                    style={{ 
                        margin: "0 10px 0 0", 
                        backgroundColor: "black", 
                        zIndex: '1300',
                        minWidth: '48px',
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        padding: '0'
                    }}
                    variant="contained"
                >
                    <Collections style={{ color: 'white' }} />
                </Button>
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
            </StyledLeftFooter>
            <StyledRightFooter className="bottomBtn" hasAd={showAd}>
                <StyledButton onClick={() => { loadRandomFrame(shows) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
            </StyledRightFooter>
            
            {showImageDrawer && (
                <ImageDrawerPopup ref={popupRef} hasAd={showAd}>
                    <Stack spacing={2}>
                        <Typography variant="h6" style={{ color: 'white', marginBottom: '8px', textAlign: 'center' }}>
                            Image Drawer ({count})
                        </Typography>
                        {collectedItems.length === 0 ? (
                            <Typography 
                                variant="body2" 
                                style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    padding: '20px 0'
                                }}
                            >
                                No images collected
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {collectedItems.map((item, index) => (
                                    <Box 
                                        key={item.id}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Typography variant="body2" style={{ color: 'white' }}>
                                            S{item.season}E{item.episode} - Frame {item.frame}
                                        </Typography>
                                        <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                            Tap to remove
                                        </Typography>
                                    </Box>
                                ))}
                                {collectedItems.length > 1 && (
                                    <Button 
                                        onClick={clearAll}
                                        variant="outlined"
                                        size="small"
                                        style={{ 
                                            color: 'white', 
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                            marginTop: '8px'
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </Stack>
                        )}
                    </Stack>
                </ImageDrawerPopup>
            )}
        </>
    );
}

FloatingActionButtons.propTypes = {
    shows: PropTypes.array.isRequired,
    showAd: PropTypes.bool.isRequired,
}