import { Link, Typography, Box } from '@mui/material';
import { useEffect } from 'react';
import { Close } from '@mui/icons-material';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const EditorPageBottomBannerAd = () => {
    const { openSubscriptionDialog } = useSubscribeDialog();

    const adSnippet = (
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-format="auto"
            data-ad-layout-key="-gw-3+1f-3d+2z"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="9837867502"
            data-full-width-responsive="true"
        />
    )

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

    const removeAdsLink = (
        <Box display='flex' justifyContent='center'>
            <Link onClick={(e) => { e.preventDefault(); openSubscriptionDialog(); }} sx={{ color: 'white', cursor: 'pointer' }} >
                <Typography fontSize={14} textAlign='center' py={2} display='flex' alignItems='center'>
                    <Close fontSize='small' sx={{ mr: 0.5 }} /> <b>Remove ads w/ memeSRC Pro</b>
                </Typography>
            </Link>
        </Box>
    );

    return (
        <Box sx={{ backgroundColor: 'black', borderRadius: 2, margin: 2 }}>
            {removeAdsLink}
            {adSnippet}
            {removeAdsLink}
        </Box>
    );
}

export default EditorPageBottomBannerAd;
