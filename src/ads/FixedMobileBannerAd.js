import { useContext, useRef } from 'react';
import styled from '@emotion/styled';
import Box from '@mui/material/Box';
import { UserContext } from '../UserContext';
import { shouldShowAds, useAdsenseLoader, useAdsenseSlot } from '../utils/adsenseLoader';

const FixedSizeAdContainer = styled(Box)`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 300px;
  height: 50px;
  max-width: 728px;
  max-height: 90px;
  margin: 0 auto;
  overflow: hidden;
`;

const FixedMobileBannerAd = () => {
    const { user } = useContext(UserContext);
    const showAds = shouldShowAds(user);
    const adRef = useRef(null);
    useAdsenseLoader();
    useAdsenseSlot({ adRef, enabled: showAds, minWidth: 300 });

    if (!showAds) {
        return null;
    }

    return (
        <FixedSizeAdContainer>
            <ins className="adsbygoogle"
                ref={adRef}
                style={{ display: 'inline-block', width: '300px', height: '50px' }}
                data-ad-client="ca-pub-1307598869123774"
                data-ad-slot="2351910795"
            />
        </FixedSizeAdContainer>
    );
}

export default FixedMobileBannerAd;
