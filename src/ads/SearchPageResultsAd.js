import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';
import { shouldShowAds, useAdsenseLoader } from '../utils/adsenseLoader';

const SearchPageResultsAd = () => {
    const { user } = useContext(UserContext);
    const showAds = shouldShowAds(user);
    useAdsenseLoader();

    useEffect(() => {
        if (!showAds) {
            return;
        }
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
    }, [showAds]);

    if (!showAds) {
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
