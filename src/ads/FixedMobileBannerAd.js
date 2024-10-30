import { useEffect, useState, useRef } from 'react';
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
    const [adFailed, setAdFailed] = useState(false);
    const observerRef = useRef(null);

    useEffect(() => {
        // Load the adsbygoogle script
        const script = document.createElement("script");
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);

        // Function to handle ad loading
        const loadAd = () => {
            try {
                window.adsbygoogle = window.adsbygoogle || [];
                window.adsbygoogle.push({});
                
                const adElement = document.querySelector('.adsbygoogle');
                observerRef.current = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.innerHTML === '') {
                            setAdFailed(true);
                            setTimeout(() => {
                                setAdFailed(false);
                                loadAd();
                            }, 2000);
                        }
                    });
                });

                observerRef.current.observe(adElement, {
                    childList: true,
                    subtree: true
                });
            } catch (error) {
                console.error('Ad loading error:', error);
                setAdFailed(true);
            }
        };

        loadAd();

        // Cleanup observer on unmount
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    return (
        <FixedSizeAdContainer style={{ backgroundColor: adFailed ? 'red' : 'transparent' }}>
            <ins className="adsbygoogle"
                style={{ display: 'inline-block', width: '300px', height: '50px' }}
                data-ad-client="ca-pub-1307598869123774"
                data-ad-slot="2351910795"
            />
        </FixedSizeAdContainer>
    );
}

export default FixedMobileBannerAd;
