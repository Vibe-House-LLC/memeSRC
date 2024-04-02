import PropTypes from 'prop-types';
import { Container, Box, Typography, useMediaQuery } from '@mui/material';
import { Favorite, Star, AccessTime, LocationOn, Check, PhotoAlbum, OpenWith, Layers, FormatShapes, AutoFixHighRounded } from '@mui/icons-material';

export default function EditorUpdates({ backgroundColor, textColor, large }) {
    const isMd = useMediaQuery(theme => theme.breakpoints.up('md'))

    return (
        <Container
            maxWidth="md"
            sx={{
                backgroundColor,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                py: 4,
            }}
        >
            <Box
                sx={{
                    textAlign: 'left',
                    mb: 4,
                    px: 2,
                    width: '100%'
                }}
            >
                <Typography fontSize={(isMd && large) ? 48 : 32} fontWeight={700} gutterBottom sx={{ color: textColor }}>
                    Editor Updates
                </Typography>
                <Typography fontSize={18} fontWeight={700} sx={{ color: textColor }}>
                    Edit anything in our new advance editor
                </Typography>
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%'
                }}
            >
                <Box display="flex" alignItems="center" mb={2} ml={2}>
                    <Box
                        sx={{
                            backgroundColor: textColor,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                        }}
                    >
                        <PhotoAlbum sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500}>
                        Edit your own pictures
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2} ml={2}>
                    <Box
                        sx={{
                            backgroundColor: textColor,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                        }}
                    >
                        <OpenWith sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500}>
                        Freeform Placement
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2} ml={2}>
                    <Box
                        sx={{
                            backgroundColor: textColor,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                        }}
                    >
                        <Layers sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500}>
                        Layers
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2} ml={2}>
                    <Box
                        sx={{
                            backgroundColor: textColor,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                        }}
                    >
                        <FormatShapes sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500}>
                        Formatting
                    </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2} ml={2}>
                    <Box
                        sx={{
                            backgroundColor: textColor,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                        }}
                    >
                        <AutoFixHighRounded sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500}>
                        Magic Tools
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
}

EditorUpdates.propTypes = {
    backgroundColor: PropTypes.string,
    textColor: PropTypes.string,
    large: PropTypes.bool
};

EditorUpdates.defaultProps = {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    large: false
};