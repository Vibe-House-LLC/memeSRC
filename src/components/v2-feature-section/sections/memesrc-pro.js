import PropTypes from 'prop-types';
import { Container, Box, Typography, useMediaQuery } from '@mui/material';
import { Favorite, Star, AccessTime, LocationOn, Bolt, SupportAgent, AutoFixHighRounded, GitHub, Check } from '@mui/icons-material';

export default function MemeSrcPro({ backgroundColor, textColor, large }) {
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
                    memeSRC Pro
                </Typography>
                <Typography fontSize={18} fontWeight={700} sx={{ color: textColor }}>
                    Help support the site and unlock extra perks
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
                        <Check sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        No Ads
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
                        <SupportAgent sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Pro Support
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
                        <Bolt sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Early Access Features
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
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Magic Tools
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
}

MemeSrcPro.propTypes = {
    backgroundColor: PropTypes.string,
    textColor: PropTypes.string,
    large: PropTypes.bool
};

MemeSrcPro.defaultProps = {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    large: false
};