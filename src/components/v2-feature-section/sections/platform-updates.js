import PropTypes from 'prop-types';

import { HowToVote, Upload, Science, GitHub, Update } from '@mui/icons-material';

export default function PlatformUpdates({ backgroundColor, textColor, large }) {
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
                    Platform Updates
                </Typography>
                <Typography fontSize={18} fontWeight={700} sx={{ color: textColor }}>
                    We've rebuilt everything from the ground up
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
                        <HowToVote sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Voting
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
                        <Upload sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Index Uploads
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
                        <Science sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Early Access
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
                            aspectRatio: '1/1'
                        }}
                    >
                        <GitHub sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Open Source
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
                            aspectRatio: '1/1'
                        }}
                    >
                        <Update sx={{ color: backgroundColor }} />
                    </Box>
                    <Typography fontSize={18} fontWeight={500} sx={{ color: textColor }}>
                        Faster, more resilient, and easier to build upon
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
}

PlatformUpdates.propTypes = {
    backgroundColor: PropTypes.string,
    textColor: PropTypes.string,
    large: PropTypes.bool
};

PlatformUpdates.defaultProps = {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    large: false
};