// ServerPage.js
import { useEffect, useState } from 'react';
import ServerInfo from '../sections/server/ServerInfo';


const ServerPage = () => {
    const [status, setStatus] = useState('loading...');
    useEffect(() => {
        

        // setInterval(() => {
        //     if (window && window.process && window.process.type) {
        //         const electron = window.require('electron');
        //         electron.ipcRenderer.invoke('get-ipfs-status').then(response => {
        //             console.log(response)
        //             setStatus(response.RateIn)
        //         }).catch(error => console.log(error))
    
    
        //         // electron.ipcRenderer.send('load-index-html');
        //     }
        // }, 1000)
        
    }, []);

    return (
        <ServerInfo />
    )
};

export default ServerPage;
