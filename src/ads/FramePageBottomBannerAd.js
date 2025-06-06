import { useContext, useEffect } from 'react';
import { Link, Typography, Box } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useSubscribeDialog } from '../contexts/useSubscribeDialog';
import { UserContext } from '../UserContext';
import { useAdsenseLoader } from '../utils/adsenseLoader';

const FramePageBottomBannerAd = () => {
    const { user } = useContext(UserContext);
    const { openSubscriptionDialog } = useSubscribeDialog();
    useAdsenseLoader();

    useEffect(() => {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
    }, []);

    if (user?.userDetails?.subscriptionStatus === 'active') {
        return null;
    }

    const adSnippet = (
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-format="auto"
            data-ad-layout-key="-gw-3+1f-3d+2z"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="1875617002"
            data-full-width-responsive="true"
        />
    )

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

export default FramePageBottomBannerAd;
