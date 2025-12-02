import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';
import { isAdPauseActive, useAdsenseLoader } from '../utils/adsenseLoader';

const HomePageBannerAd = () => {
    const { user } = useContext(UserContext);
    const adsPaused = isAdPauseActive();
    const isPro = user?.userDetails?.subscriptionStatus === 'active';
    useAdsenseLoader();

    useEffect(() => {
        if (adsPaused || isPro) {
            return;
        }
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
    }, [adsPaused, isPro]);

    if (adsPaused || isPro) {
        return null;
    }

    return (
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-format="fluid"
            data-ad-layout-key="-gw-3+1f-3d+2z"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="3283043030"
        />
    );
}

export default HomePageBannerAd;
