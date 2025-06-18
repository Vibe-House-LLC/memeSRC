import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Fab, Button, styled, Stack, Typography, Box } from '@mui/material';
import { MapsUgc, Favorite, Shuffle, Collections } from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';
import useLoadRandomFrame from '../../utils/loadRandomFrame';

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
    left: 20px;
    background-color: rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 16px;
    min-width: 200px;
    max-width: 300px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1301;
    backdrop-filter: blur(4px);
`;

export default function FloatingActionButtons({ shows, showAd }) {
    const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
    const [showImageDrawer, setShowImageDrawer] = useState(false);
    const [queuedImages, setQueuedImages] = useState([]); // This will hold the metadata images
    const popupRef = useRef(null);
    const buttonRef = useRef(null);

    console.log('showImageDrawer:', showImageDrawer, 'queuedImages.length:', queuedImages.length);

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
                            Image Drawer
                        </Typography>
                        {queuedImages.length === 0 ? (
                            <Typography 
                                variant="body2" 
                                style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    padding: '20px 0'
                                }}
                            >
                                No images added
                            </Typography>
                        ) : (
                            <Stack spacing={1}>
                                {queuedImages.map((image, index) => (
                                    <Box 
                                        key={index}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {/* Future: Display image thumbnail and metadata */}
                                        <Typography variant="body2" style={{ color: 'white' }}>
                                            Image {index + 1}
                                        </Typography>
                                    </Box>
                                ))}
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