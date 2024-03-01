import React, { useState, useCallback } from 'react';
import { Box, Button, TextField, LinearProgress } from '@mui/material';

function CreateIndex({ onProcessComplete }) {
    const [folderPath, setFolderPath] = useState('');
    const [id, setId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [frameCount, setFrameCount] = useState(10);
    const [colorMain, setColorMain] = useState('');
    const [colorSecondary, setColorSecondary] = useState('');
    const [emoji, setEmoji] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

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
                id,
                title,
                description,
                frameCount,
                colorMain,
                colorSecondary,
                emoji
            };
    
            ipcRenderer.send('test-javascript-processing', ipcArguments);
            ipcRenderer.once('javascript-processing-result', (event, response) => {
                console.log('JavaScript processing result:', response);
                setIsProcessing(false);
                setProgress(100); // Assume process is complete for now
                if (onProcessComplete) {
                    onProcessComplete(response);
                }
            });
            ipcRenderer.once('javascript-processing-error', (event, error) => {
                console.error('JavaScript processing error:', error);
                setIsProcessing(false);
            });
        } catch (error) {
            console.error('Failed in starting processing steps:', error);
            setIsProcessing(false);
        }
    }, [folderPath, id, title, description, frameCount, colorMain, colorSecondary, emoji, onProcessComplete]);

    return (
        <>
            <Box sx={{ padding: '20px', mt: 3 }}>
                <Button variant="contained" onClick={selectDirectory} sx={{ mb: 2 }}>
                    Select Folder
                </Button>
                <div>Selected Folder: {folderPath}</div>
                <TextField label="Output Folder ID" variant="outlined" fullWidth margin="normal" value={id} onChange={(e) => setId(e.target.value)} />
                <TextField label="Title" variant="outlined" fullWidth margin="normal" value={title} onChange={(e) => setTitle(e.target.value)} />
                <TextField label="Description" variant="outlined" fullWidth margin="normal" value={description} onChange={(e) => setDescription(e.target.value)} />
                <TextField label="Frame Count" type="number" variant="outlined" fullWidth margin="normal" value={frameCount} onChange={(e) => setFrameCount(e.target.value)} />
                <TextField label="Main Color" variant="outlined" fullWidth margin="normal" value={colorMain} onChange={(e) => setColorMain(e.target.value)} />
                <TextField label="Secondary Color" variant="outlined" fullWidth margin="normal" value={colorSecondary} onChange={(e) => setColorSecondary(e.target.value)} />
                <TextField label="Emoji" variant="outlined" fullWidth margin="normal" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
                <Button color="primary" variant="contained" disabled={isProcessing || !folderPath || !id} onClick={handleProcessStart} sx={{ mt: 2 }}>
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
