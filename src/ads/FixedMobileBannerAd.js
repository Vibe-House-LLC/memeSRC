import { useEffect } from 'react';
import styled from '@emotion/styled';
import Box from '@mui/material/Box';

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
        <FixedSizeAdContainer>
            <ins className="adsbygoogle"
            style={{ display: 'inline-block', width: '300px', height: '50px' }}
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="2351910795"
        />
        </FixedSizeAdContainer>
    );
}

export default FixedMobileBannerAd;
