import { Box, Link, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Close } from '@mui/icons-material';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const MagicToolsLoadingAd = () => {
    const { openSubscriptionDialog } = useSubscribeDialog();

    useEffect(() => {
        // Load the adsbygoogle script
        const script = document.createElement("script");
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);

        // Initialize the adsbygoogle array if it doesn't exist and push an ad
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
    }, []);

    return (
        <>
            <Box display='flex' justifyContent='center'>
                <Link onClick={(e) => { e.preventDefault(); openSubscriptionDialog(); }} sx={{ color: 'white', cursor: 'pointer' }} >
                    <Typography fontSize={14} textAlign='center' pb={2} display='flex' alignItems='center'>
                        <Close fontSize='small' sx={{ mr: 0.5 }} /> <b>Remove ads w/ memeSRC Pro</b>
                    </Typography>
                </Link>
            </Box>
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-format="auto"
                data-ad-client="ca-pub-1307598869123774"
                data-ad-slot="9331397200"
                data-full-width-responsive="true"
            />
        </>
    );
}

export default MagicToolsLoadingAd;
