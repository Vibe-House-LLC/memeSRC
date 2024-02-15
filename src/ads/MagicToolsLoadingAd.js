import { useEffect } from 'react';

const MagicToolsLoadingAd = () => {

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
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-format="auto"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="9331397200"
            data-full-width-responsive="true"
        />
    );
}

export default MagicToolsLoadingAd;
