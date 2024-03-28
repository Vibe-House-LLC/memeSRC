import { Link, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';

const EditorPageBottomBannerAd = () => {
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
            <Link onClick={(e) => { e.preventDefault(); openSubscriptionDialog(); }} sx={{ color: theme => theme.palette.success.main, cursor: 'pointer' }} >
                <Typography fontSize={14} textAlign='center' py={4}>
                    Remove ads w/ memeSRC Pro
                </Typography>
            </Link>
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-format="auto"
                data-ad-layout-key="-gw-3+1f-3d+2z"
                data-ad-client="ca-pub-1307598869123774"
                data-ad-slot="9837867502"
                data-full-width-responsive="true"
            />
        </>
    );
}

export default EditorPageBottomBannerAd;
