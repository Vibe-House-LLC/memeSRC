import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, TextField, LinearProgress } from '@mui/material';

function CreateIndex({ onProcessComplete }) {
    const [folderPath, setFolderPath] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [id, setId] = useState('');

    // Function to invoke directory selection dialog in Electron
    const selectDirectory = async () => {
        const electron = window.require('electron');
        const path = await electron.ipcRenderer.invoke('open-directory-dialog');
        if (path) {
            setFolderPath(path);
        }
    };

    const handleProcessStart = useCallback(async () => {
        setIsProcessing(true);
        setProgress(0); // Reset progress to 0
    
        try {
            const electron = window.require('electron');
            const ipcRenderer = electron.ipcRenderer;
            const ipcArguments = {
                inputPath: folderPath,
                id
            };
    
            // Start the Python script without waiting for it to finish
            // ipcRenderer.send('start-python-script', ipcArguments);
            // console.log('Python script execution started');
    
            // Call the test JavaScript processing IPC handler
            ipcRenderer.send('test-javascript-processing', ipcArguments);
            ipcRenderer.once('javascript-processing-result', (event, response) => {
                console.log('JavaScript processing result:', response);
            });
            ipcRenderer.once('javascript-processing-error', (event, error) => {
                console.error('JavaScript processing error:', error);
            });
    
            // // Set up an interval to periodically check the processing status
            // const progressInterval = setInterval(async () => {
            //     try {
            //         const response = await ipcRenderer.invoke('fetch-processing-status', id);
            //         if (response.success && response.status) {
            //             const percentComplete = response.status.percent_complete;
            //             console.log("percentComplete", percentComplete);
            //             setProgress(Math.round(percentComplete));
            //             if (percentComplete >= 100) {
            //                 clearInterval(progressInterval);
            //                 setIsProcessing(false);
            //             }
            //         }
            //     } catch (error) {
            //         console.error('Failed to fetch processing status:', error);
            //         clearInterval(progressInterval);
            //         setIsProcessing(false);
            //     }
            // }, 5000); // Update progress every 5 seconds
        } catch (error) {
            console.error('Failed in starting processing steps:', error);
            setIsProcessing(false);
        }
    }, [folderPath, id]);
    

    useEffect(() => {
        const electron = window.require('electron');

        // Listener for Python script response
        const handleScriptResponse = async (event, response) => {
            console.log('Python script executed with response:', response);
            if (response.success) {
                // Since the Python script finished, proceed with IPFS addition
                try {
                    const processedFolderPath = `~/.memesrc/processing/${id}`; // Adjust the path as needed
                    console.log(`About to add this to ipfs: ${processedFolderPath}`);
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
            setProgress(0); // Reset progress
            setId(''); // Reset ID for the next use
            setFolderPath(''); // Reset folder path for the next use
        };

        electron.ipcRenderer.on('python-script-response', handleScriptResponse);

        // Cleanup listeners on component unmount
        return () => {
            electron.ipcRenderer.removeListener('python-script-response', handleScriptResponse);
        };
    }, [id, onProcessComplete]);

    return (
        <>
            <Box sx={{ padding: '20px', mt: 3 }}>
                <Button
                    variant="contained"
                    onClick={selectDirectory}
                    sx={{ mb: 2 }}
                >
                    Select Folder
                </Button>
                <div>
                    Selected Folder: {folderPath}
                </div>
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
                {isProcessing && (
                    <>
                        <LinearProgress variant="determinate" value={Math.round(progress)} sx={{ mt: 2, mb: 1 }} />
                        <p>Processing... {progress}%</p>
                    </>
                )}
            </Box>
        </>
    );
}

export default CreateIndex;
