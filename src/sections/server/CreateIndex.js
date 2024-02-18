import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, TextField } from '@mui/material';

function CreateIndex({ onProcessComplete }) {
    const [folderPath, setFolderPath] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [id, setId] = useState('');

    const handleProcessStart = useCallback(async () => {
        setIsProcessing(true);

        try {
            const electron = window.require('electron');
            const ipcArguments = {
                inputPath: folderPath,
                id
            };

            // Start the Python script without waiting for it to finish
            electron.ipcRenderer.send('start-python-script', ipcArguments);
            console.log('Python script execution started');
        } catch (error) {
            console.error('Failed in starting processing steps:', error);
            setIsProcessing(false);
        }
    }, [folderPath, id]);

    useEffect(() => {
        const electron = window.require('electron');

        // Listener for Python script started
        const handleScriptStarted = (event, response) => {
            console.log('Python script has started', response);
        };

        // Listener for Python script response
        const handleScriptResponse = async (event, response) => {
            console.log('Python script executed with response:', response);
            if (response.success) {
                // Since the Python script finished, proceed with IPFS addition
                try {
                    const processedFolderPath = `~/.memesrc/processing/${id}`; // Adjust the path as needed
                    console.log(`About to add this to ipfs: ${processedFolderPath}`)
                    const ipfsResult = await electron.ipcRenderer.invoke('add-processed-index-to-ipfs', processedFolderPath);
                    console.log('Added processed index to IPFS successfully:', ipfsResult);

                    // Optional: Callback for post-processing with IPFS result
                    if (onProcessComplete) {
                        onProcessComplete(ipfsResult);
                    }
                } catch (ipfsError) {
                    console.error('Failed in adding index to IPFS:', ipfsError);
                }
            } else {
                console.error('Python script failed:', response.error);
            }
            setIsProcessing(false);
            setId(''); // Reset ID for the next use
            setFolderPath(''); // Reset folder path for the next use
        };

        electron.ipcRenderer.on('python-script-started', handleScriptStarted);
        electron.ipcRenderer.on('python-script-response', handleScriptResponse);

        // Cleanup listeners on component unmount
        return () => {
            electron.ipcRenderer.removeListener('python-script-started', handleScriptStarted);
            electron.ipcRenderer.removeListener('python-script-response', handleScriptResponse);
        };
    }, [id, onProcessComplete]);

    return (
        <>
            <Box sx={{ padding: '20px', mt: 3 }}>
                <TextField
                    label="Folder Path"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                />
                <TextField
                    label="Output Folder ID"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                />
                <Button
                    color="primary"
                    variant="contained"
                    disabled={isProcessing || !folderPath || !id}
                    onClick={handleProcessStart}
                    sx={{ mt: 2 }}
                >
                    Start Processing
                </Button>
                {isProcessing && <p>Processing...</p>}
            </Box>
        </>
    );
}

export default CreateIndex;
