import { useContext, useRef } from 'react';
import { UserContext } from '../UserContext';
import { shouldShowAds, useAdsenseLoader, useAdsenseSlot } from '../utils/adsenseLoader';

const SearchPageResultsAd = () => {
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
            style={{ display: 'block', textAlign: 'center' }}
            data-ad-format="fluid"
            data-ad-layout="in-article"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="7742133307"
        />
    );
}

export default SearchPageResultsAd;
