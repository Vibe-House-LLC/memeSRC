import React, { useState, useEffect, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Backdrop, Typography, Stack, LinearProgress, Box } from '@mui/material';
import Logo from './logo';
import MagicToolsLoadingAd from '../ads/MagicToolsLoadingAd';
import { UserContext } from '../UserContext';

function LoadingBackdrop({ open, duration = 20 }) {
    const { user } = useContext(UserContext)
    const [progress, setProgress] = useState(0);
    const [progressVariant, setProgressVariant] = useState('determinate');
    const [messageIndex, setMessageIndex] = useState(0);
    
    const messages = useMemo(() => [
        "Generating 2 results...",
        "This will take a few seconds...",
        "Magic is hard work, you know?",
        "Just about done!",
        // "I'm gettin' too old for this shit.",
        "Hang tight, wrapping up...",
    ], []);

    useEffect(() => {
        if (open) {
            setProgress(0);
            setMessageIndex(0);
            setProgressVariant('determinate');
        }
    }, [open]);

    // Progress bar effect
    useEffect(() => {
        if (!open) return () => { };

        const progressUpdatesPerSecond = 2;
        const progressIncrement = 100 / (duration * progressUpdatesPerSecond);

        const progressTimer = setInterval(() => {
            setProgress((prevProgress) => {
                const newProgress = prevProgress + progressIncrement;

                if (newProgress >= 100) {
                    setProgressVariant('indeterminate');
                    return 100;
                }

                return newProgress;
            });
        }, 1000 / progressUpdatesPerSecond);

        return () => {
            clearInterval(progressTimer);
        };
    }, [duration, open]);

    // Message progression effect (independent of progress)
    useEffect(() => {
        if (!open) return () => { };

        const messageInterval = setInterval(() => {
            setMessageIndex(prev => prev < messages.length - 1 ? prev + 1 : prev);
        }, (duration * 1000) / messages.length);

        return () => {
            clearInterval(messageInterval);
        };
    }, [open, duration, messages]);

    return (
        <Backdrop
            sx={{
                color: '#fff',
                zIndex: (theme) => theme.zIndex.drawer + 1,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.9)' // Adjusted the alpha value to 0.9 for more opacity
            }}
            open={open}
        >
            <Stack alignItems="center" direction="column" spacing={2}>
                <Logo sx={{ display: 'inline', width: '90px', height: 'auto', margin: '-10px', color: 'yellow' }} color='white' />
                <Typography variant="h5">{messages[messageIndex]}</Typography>
                <LinearProgress
                    variant={progressVariant}
                    value={progress}
                    sx={{
                        width: '400px',
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: (theme) => theme.palette.success.main
                        }
                    }}
                />
                <Typography variant="caption" sx={{ marginTop: 'px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Wait while memeSRC works its magic
                </Typography>
                {user?.userDetails?.subscriptionStatus !== 'active' && open &&
                    <Box sx={{ width: '95vw', maxWidth: 400 }}>
                        <MagicToolsLoadingAd />
                    </Box>
                }
            </Stack>



        </Backdrop>
    );
}

LoadingBackdrop.propTypes = {
    open: PropTypes.bool,
    duration: PropTypes.number,
};

export default LoadingBackdrop;
