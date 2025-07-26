import PropTypes from 'prop-types';
import { Container, Box, Typography, useMediaQuery } from '@mui/material';
import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import LayersIcon from '@mui/icons-material/Layers';
import FormatShapesIcon from '@mui/icons-material/FormatShapes';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';

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
                        <PhotoAlbumIcon sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
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
                        <OpenWithIcon sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
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
                        <LayersIcon sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
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
                        <FormatShapesIcon sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
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
                        <AutoFixHighRoundedIcon sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
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