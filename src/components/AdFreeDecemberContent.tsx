import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Logo from './logo/Logo';

interface AdFreeDecemberContentProps {
    onClose: () => void;
    onShowSecondChance: () => void;
    showSecondChance: boolean;
}

export function AdFreeDecemberContent({ onClose, onShowSecondChance, showSecondChance }: AdFreeDecemberContentProps) {
    const handleClose = () => {
        if (!showSecondChance) {
            onShowSecondChance();
        } else {
            onClose();
        }
    };

    const textColor = '#ffffff';
    const secondaryTextColor = 'rgba(255, 255, 255, 0.8)';

    // Pro button gradient
    const proButtonGradient = 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)';
    const proButtonShadow = '0 4px 14px 0 rgba(255, 215, 0, 0.39)';

    if (showSecondChance) {
        return (
            <>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 56,
                                height: 56,
                                borderRadius: 3,
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                            }}
                        >
                            <Logo color="#ffffff" sx={{ width: 42 }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: 1.2,
                                    color: secondaryTextColor,
                                    fontSize: '0.75rem',
                                    lineHeight: 1,
                                    display: 'block',
                                    mb: 0.5,
                                }}
                            >
                                Wait!
                            </Typography>
                            <Typography
                                component="h3"
                                variant="h4"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                    lineHeight: 1,
                                    letterSpacing: -0.5,
                                    color: textColor,
                                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                                }}
                            >
                                One Last Thing
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton
                        aria-label="Dismiss ad-free announcement"
                        onClick={onClose}
                        size="small"
                        sx={{
                            color: textColor,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(8px)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                <Typography
                    variant="body1"
                    sx={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        fontWeight: 500,
                        fontSize: { xs: '1.05rem', sm: '1.1rem' },
                        lineHeight: 1.6,
                        mb: 4,
                        textAlign: 'center',
                        px: 1,
                    }}
                >
                    Pro members directly support the operation and development of memeSRC, and have access to extra features!
                </Typography>

                <Stack spacing={2} sx={{ width: '100%' }}>
                    <Button
                        variant="contained"
                        href="/pro"
                        fullWidth
                        sx={{
                            borderRadius: 3,
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            color: '#000000',
                            background: proButtonGradient,
                            boxShadow: proButtonShadow,
                            border: 'none',
                            '&:hover': {
                                background: 'linear-gradient(90deg, #FFC700 0%, #FF9500 100%)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 6px 20px rgba(255, 215, 0, 0.4)',
                            },
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <Box component="span" sx={{ mr: 1.5, fontSize: '1.2em' }}>⬆️</Box>
                        Try memeSRC Pro
                    </Button>
                    <Button
                        variant="text"
                        onClick={onClose}
                        fullWidth
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            py: 1.5,
                            borderRadius: 3,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'rgba(255, 255, 255, 1)',
                            },
                            transition: 'all 0.2s ease',
                        }}
                    >
                        I understand, dismiss
                    </Button>
                </Stack>
            </>
        );
    }

    return (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                        }}
                    >
                        <Logo color="#ffffff" sx={{ width: 42 }} />
                    </Box>
                    <Box>
                        <Typography
                            variant="overline"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: 1.2,
                                color: secondaryTextColor,
                                fontSize: '0.75rem',
                                lineHeight: 1,
                                display: 'block',
                                mb: 0.5,
                            }}
                        >
                            🎄 Happy Holidays
                        </Typography>
                        <Typography
                            component="h3"
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                lineHeight: 1,
                                letterSpacing: -0.5,
                                color: textColor,
                                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            No Ads in Dec ❄️
                        </Typography>
                    </Box>
                </Stack>
                <IconButton
                    aria-label="Dismiss ad-free announcement"
                    onClick={handleClose}
                    size="small"
                    sx={{
                        color: textColor,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backdropFilter: 'blur(8px)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            <Typography
                variant="body1"
                sx={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontWeight: 500,
                    fontSize: { xs: '1.05rem', sm: '1.1rem' },
                    lineHeight: 1.6,
                    mb: 4,
                    textAlign: 'center',
                    px: 1,
                    textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
                }}
            >
                We know ads suck, but they help keep memeSRC alive.{' '}
                <Box component="span" sx={{ fontWeight: 800, color: '#FFD700' }}>
                    We're turning them off for the holidays.
                </Box>
            </Typography>

            <Stack spacing={2} sx={{ width: '100%' }}>
                <Button
                    variant="contained"
                    href="/pro"
                    fullWidth
                    sx={{
                        borderRadius: 3,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: '#000000',
                        background: proButtonGradient,
                        boxShadow: proButtonShadow,
                        border: 'none',
                        '&:hover': {
                            background: 'linear-gradient(90deg, #FFC700 0%, #FF9500 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 6px 20px rgba(255, 215, 0, 0.4)',
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Box component="span" sx={{ mr: 1.5, fontSize: '1.2em' }}>⬆️</Box>
                    Support with Pro
                </Button>
                <Button
                    variant="contained"
                    href="/donate"
                    fullWidth
                    sx={{
                        borderRadius: 3,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        color: textColor,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        backdropFilter: 'blur(4px)',
                        boxShadow: 'none',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    <Box component="span" sx={{ mr: 1.5, fontSize: '1.2em' }}>🎁</Box>
                    Support with Gift
                </Button>
                <Button
                    variant="text"
                    onClick={onShowSecondChance}
                    fullWidth
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        py: 1,
                        borderRadius: 3,
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            color: 'rgba(255, 255, 255, 1)',
                        },
                        transition: 'all 0.2s ease',
                    }}
                >
                    Maybe later
                </Button>
            </Stack>
        </>
    );
}
