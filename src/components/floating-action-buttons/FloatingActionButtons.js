import { useState, useEffect, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { Fab, Button, styled, Stack, Typography, Box, CardMedia, Divider, Badge } from '@mui/material';
import { MapsUgc, Favorite, Shuffle, Dashboard, Delete, Edit } from '@mui/icons-material';
import LoadingButton from '@mui/lab/LoadingButton';
import { useNavigate } from 'react-router-dom';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { useCollage } from '../../contexts/CollageContext';
import { UserContext } from '../../UserContext';

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
    bottom: ${props => props.hasAd ? '50px' : '0px'};
    left: 0;
    right: 0;
    width: 100%;
    background: linear-gradient(to bottom, 
        rgba(0, 0, 0, 0.9) 0%, 
        rgba(0, 0, 0, 0.6) 70%, 
        rgba(0, 0, 0, 0.4) 90%, 
        rgba(0, 0, 0, 0.3) 100%
    );
    padding: 20px 16px 68px 16px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 1301;
    backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    animation: ${props => props.isClosing ? 'slideDownFade' : 'slideUpFade'} 0.4s ease-out forwards;
    
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
    
    @keyframes slideDownFade {
        0% {
            transform: translateY(0);
            opacity: 1;
        }
        100% {
            transform: translateY(100%);
            opacity: 0;
        }
    }
`;

// Helper function to generate image URL from collage item
const getImageUrl = (item) => {
    if (item.frameImage && item.frameImage.startsWith('http')) {
        return item.frameImage;
    }
    // Use the same URL format as videoFrameExtractor.js
    return `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/frame/${item.cid}/${item.season}/${item.episode}/${item.frame}`;
};

export default function FloatingActionButtons({ shows, showAd }) {
    const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
    const { collageItems, clearAll, removeItem, count } = useCollage();
    const [showImageDrawer, setShowImageDrawer] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const popupRef = useRef(null);
    const buttonRef = useRef(null);
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    
    // Check if user is an admin
    const hasCollageAccess = user?.['cognito:groups']?.includes('admins');

    console.log('showImageDrawer:', showImageDrawer, 'collageItems.length:', collageItems.length);

    // Function to handle closing with animation
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowImageDrawer(false);
            setIsClosing(false);
        }, 400); // Match animation duration
    };

    // Function to create collage from collage items
    const handleCreateCollage = () => {
        if (collageItems.length === 0) return;
        
        console.log('[COLLAGE DEBUG] Original collage items:', collageItems);
        
        // Transform collage items into format expected by collage system
        const collageImages = collageItems.map(item => ({
            originalUrl: getImageUrl(item),
            displayUrl: getImageUrl(item),
            subtitle: item.subtitle || '',
            subtitleShowing: item.subtitleShowing || false,
            metadata: {
                season: item.season,
                episode: item.episode,
                frame: item.frame,
                timestamp: item.timestamp,
                showTitle: item.showTitle
            }
        }));

        console.log('[COLLAGE DEBUG] Transformed collage images:', collageImages);

        // Navigate to collage page with images
        navigate('/collage', { 
            state: { 
                fromCollage: true,
                images: collageImages 
            } 
        });
        
        // Close the drawer with animation
        handleClose();
    };

    // Handle click outside to close popup
    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                handleClose();
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
                {hasCollageAccess ? (
                    // Show Collage button for users with access
                    <Badge 
                        badgeContent={count} 
                        color="error"
                        max={99}
                        invisible={count === 0}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        sx={{
                            '& .MuiBadge-badge': {
                                fontSize: '0.7rem',
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 4px',
                                backgroundColor: '#ff4444',
                                color: 'white',
                                fontWeight: 'bold',
                                top: '6px',
                                right: '14px',
                                border: '2px solid black',
                                borderRadius: '10px',
                                zIndex: 1301,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }
                        }}
                    >
                        <StyledButton 
                            ref={buttonRef}
                            onClick={() => showImageDrawer ? handleClose() : setShowImageDrawer(true)}
                            startIcon={<Dashboard />} 
                            variant="contained" 
                            style={{ backgroundColor: "black", zIndex: '1300' }}
                        >
                            Collage
                        </StyledButton>
                    </Badge>
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
                <StyledButton onClick={() => { loadRandomFrame(shows) }} loading={loadingRandom} startIcon={<Shuffle />} variant="contained" style={{ backgroundColor: "black", marginLeft: 'auto', zIndex: '1300' }} >Random</StyledButton>
            </StyledRightFooter>
            
            {hasCollageAccess && (showImageDrawer || isClosing) && (
                <ImageDrawerPopup ref={popupRef} hasAd={showAd} isClosing={isClosing} itemCount={count}>
                    <Stack spacing={2}>
                        <Typography variant="h6" style={{ color: 'white', marginBottom: '8px', textAlign: 'center' }}>
                            Collage Images ({count})
                        </Typography>
                        {collageItems.length === 0 ? (
                            <Typography 
                                variant="body2" 
                                style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    padding: '20px 0'
                                }}
                            >
                                No images in collage
                            </Typography>
                        ) : (
                            <Stack spacing={2}>
                                {collageItems.map((item, index) => (
                                    <Box 
                                        key={item.id}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)'
                                        }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="flex-start">
                                            {/* Thumbnail */}
                                            <Box style={{ flexShrink: 0 }}>
                                                <CardMedia
                                                    component="img"
                                                    src={getImageUrl(item)}
                                                    alt={`S${item.season}E${item.episode} Frame ${item.frame}`}
                                                    style={{
                                                        width: '80px',
                                                        height: '45px',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                                        e.target.style.display = 'flex';
                                                        e.target.style.alignItems = 'center';
                                                        e.target.style.justifyContent = 'center';
                                                        e.target.innerHTML = '📷';
                                                    }}
                                                />
                                            </Box>
                                            
                                            {/* Content */}
                                            <Stack spacing={1} style={{ flex: 1, minWidth: 0 }}>
                                                <Typography variant="body2" style={{ color: 'white', fontWeight: 'bold' }}>
                                                    S{item.season}E{item.episode} - Frame {item.frame}
                                                </Typography>
                                                {item.timestamp && (
                                                    <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                                        {item.timestamp}
                                                    </Typography>
                                                )}
                                                {item.subtitle && (
                                                    <Box style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                        <Typography 
                                                            variant="body2" 
                                                            style={{ 
                                                                color: 'rgba(255, 255, 255, 0.9)',
                                                                fontStyle: 'italic',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                flex: 1
                                                            }}
                                                        >
                                                            "{item.subtitle}"
                                                        </Typography>
                                                        {item.subtitleShowing && (
                                                            <Edit 
                                                                style={{ 
                                                                    color: '#4CAF50', 
                                                                    fontSize: '14px',
                                                                    marginTop: '2px',
                                                                    flexShrink: 0
                                                                }} 
                                                                titleAccess="Image shows subtitle"
                                                            />
                                                        )}
                                                    </Box>
                                                )}
                                            </Stack>
                                            
                                            {/* Remove button */}
                                            <Button
                                                onClick={() => removeItem(item.id)}
                                                size="small"
                                                style={{
                                                    minWidth: '32px',
                                                    width: '32px',
                                                    height: '32px',
                                                    padding: '0',
                                                    color: 'rgba(255, 255, 255, 0.7)',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <Delete fontSize="small" />
                                            </Button>
                                        </Stack>
                                        
                                        {index < collageItems.length - 1 && (
                                            <Divider style={{ 
                                                marginTop: '12px', 
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                                            }} />
                                        )}
                                    </Box>
                                ))}
                                
                                <Button 
                                    onClick={handleCreateCollage}
                                    variant="contained"
                                    size="medium"
                                    fullWidth
                                    disabled={count > 5}
                                    style={{ 
                                        backgroundColor: count > 5 ? '#666666' : '#4CAF50',
                                        color: 'white',
                                        marginTop: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    startIcon={<Dashboard />}
                                >
                                    Create Collage ({count} images)
                                </Button>
                                
                                {count > 5 && (
                                    <Typography 
                                        variant="caption" 
                                        style={{ 
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            fontStyle: 'italic',
                                            textAlign: 'center',
                                            marginTop: '8px',
                                            display: 'block'
                                        }}
                                    >
                                        Maximum 5 images allowed for collage
                                    </Typography>
                                )}
                                
                                {collageItems.length > 1 && (
                                    <Button 
                                        onClick={clearAll}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        style={{ 
                                            color: 'white', 
                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                            marginTop: '8px'
                                        }}
                                        startIcon={<Delete />}
                                    >
                                        Clear All ({count})
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