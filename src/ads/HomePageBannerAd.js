import { useContext, useRef } from 'react';
import { UserContext } from '../UserContext';
import { shouldShowAds, useAdsenseLoader, useAdsenseSlot } from '../utils/adsenseLoader';

const HomePageBannerAd = () => {
    const { user } = useContext(UserContext);
    const showAds = shouldShowAds(user);
    const adRef = useRef(null);
    useAdsenseLoader();
    useAdsenseSlot({ adRef, enabled: showAds });

    if (!showAds) {
        return null;
    }

    return (
        <ins className="adsbygoogle"
            ref={adRef}
            style={{ display: 'block' }}
            data-ad-format="fluid"
            data-ad-layout-key="-gw-3+1f-3d+2z"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="3283043030"
        />
    );
}

export default HomePageBannerAd;
