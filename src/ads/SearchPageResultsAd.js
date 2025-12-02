import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';
import { isAdPauseActive, useAdsenseLoader } from '../utils/adsenseLoader';

const SearchPageResultsAd = () => {
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
            style={{ display: 'block', textAlign: 'center' }}
            data-ad-format="fluid"
            data-ad-layout="in-article"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="7742133307"
        />
    );
}

export default SearchPageResultsAd;
