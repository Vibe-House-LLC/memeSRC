import { useEffect } from 'react';

const AutoAdWrapper = ({ children }) => {
    useEffect(() => {
        const script = document.createElement('script');

        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.setAttribute('data-ad-client', 'ca-pub-1307598869123774');

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return <>{children}</>;
};

export default AutoAdWrapper;
