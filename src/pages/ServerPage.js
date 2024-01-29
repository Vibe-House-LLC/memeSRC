// ServerPage.js
import { useEffect } from 'react';

const ServerPage = () => {
    useEffect(() => {
        if (window && window.process && window.process.type) {
            const electron = window.require('electron');
            electron.ipcRenderer.send('load-index-html');
        }
    }, []);

    // Optionally, render something or redirect to another page
    return null; // Or return a loading indicator, or redirect to home, etc.
};

export default ServerPage;
