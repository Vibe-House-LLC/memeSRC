import { useEffect } from 'react';

const EpisodeViewResultsAd = () => {

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
            style={{ display: 'block'}}
            data-ad-format="auto"
            data-full-width-responsive="true"
            data-ad-client="ca-pub-1307598869123774"
            data-ad-slot="7224108613"
        />
    );
}

export default EpisodeViewResultsAd;
