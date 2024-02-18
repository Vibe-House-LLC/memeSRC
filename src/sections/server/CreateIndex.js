import React, { useState, useCallback } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';

function CreateIndex({ onProcessComplete }) {
    const [folderPath, setFolderPath] = useState('');
    const [ffmpegPath, setFfmpegPath] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [id, setId] = useState('');

    const handleProcessStart = useCallback(() => {
        setIsProcessing(true);

        const electron = window.require('electron');
        const ipcArguments = {
            inputPath: folderPath,
            ffmpegPath, // Assume this is set from another input or config
            id // ID provided by the user
        };

        electron.ipcRenderer.invoke('run-python-script', ipcArguments)
            .then(result => {
                console.log('Python script executed successfully:', result);
                onProcessComplete(result); // Optional: Callback for post-processing
            })
            .catch(error => {
                console.error('Failed to run Python script:', error);
                // Handle errors, such as showing an error message to the user
            })
            .finally(() => {
                setIsProcessing(false);
                setId(''); // Reset ID for the next use
                setFolderPath(''); // Reset folder path for the next use
            });
    }, [folderPath, ffmpegPath, id, onProcessComplete]);

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
