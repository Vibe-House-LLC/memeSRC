// CreateIndex.js

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, TextField, LinearProgress, Typography } from '@mui/material';
import ProcessingDialog from './ProcessingDialog';

function CreateIndex({ onProcessComplete }) {
  const [folderPath, setFolderPath] = useState('');
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frameCount, setFrameCount] = useState(10);
  const [fontFamily, setFontFamily] = useState('');
  const [colorMain, setColorMain] = useState('');
  const [colorSecondary, setColorSecondary] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previousJobs, setPreviousJobs] = useState([]);

  const selectDirectory = async () => {
    const electron = window.require('electron');
    const path = await electron.ipcRenderer.invoke('open-directory-dialog');
    if (path) {
      setFolderPath(path);
    }
  };

  const handleProcessStart = useCallback(async () => {
    setIsProcessing(true);
    setIsDialogOpen(true);
    setProgress(0);
  
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
      emoji,
      fontFamily
    };
  
    // Save the folderPath in jobs.json
    await ipcRenderer.invoke('save-job-folder-path', { id, folderPath });
  
    ipcRenderer.send('test-javascript-processing', ipcArguments);

    ipcRenderer.once('javascript-processing-result', (event, response) => {
      console.log('JavaScript processing result:', response);
      setIsProcessing(false);
      setProgress(100);
      if (onProcessComplete) {
        onProcessComplete(response);
      }
    });

    ipcRenderer.once('javascript-processing-error', (event, error) => {
      console.error('JavaScript processing error:', error);
      setIsProcessing(false);
    });
  }, [folderPath, id, title, description, frameCount, colorMain, colorSecondary, emoji, fontFamily, onProcessComplete]);

  const fetchPreviousJobs = useCallback(async () => {
    const electron = window.require('electron');
    const jobs = await electron.ipcRenderer.invoke('get-previous-jobs');
    setPreviousJobs(jobs);
  }, []);

  useEffect(() => {
    fetchPreviousJobs();
  }, [fetchPreviousJobs]);

  const handleResumeIndexing = useCallback(async (job) => {
    
    // Update the component's state with the metadata from the selected job
    setFolderPath(job.folderPath);
    setId(job.id);
    setTitle(job.title);
    setDescription(job.description);
    setFrameCount(job.frameCount);
    setColorMain(job.colorMain);
    setColorSecondary(job.colorSecondary);
    setEmoji(job.emoji);
    setFontFamily(job.fontFamily)
    
    // setIsProcessing(true);
    // setIsDialogOpen(true);
    setProgress(0);
  }, [onProcessComplete]);

  useEffect(() => {
    let progressInterval;
    if (isProcessing) {
      const electron = window.require('electron');
      progressInterval = setInterval(async () => {
        try {
          const response = await electron.ipcRenderer.invoke('fetch-processing-status', id);
          if (response.success && response.status) {
            let totalPercent = 0;
            let count = 0;
            Object.keys(response.status).forEach(season => {
              Object.values(response.status[season]).forEach(status => {
                switch (status) {
                  case 'done':
                    totalPercent += 100;
                    break;
                  case 'indexing':
                    totalPercent += 50;
                    break;
                  default:
                    break;
                }
                count += 1;
              });
            });
            const percentComplete = count > 0 ? totalPercent / count : 0;
            setProgress(Math.round(percentComplete));
          }
        } catch (error) {
          console.error('Failed to fetch processing status:', error);
          clearInterval(progressInterval);
        }
      }, 5000);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [id, isProcessing]);

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
        <TextField label="Font Family" variant="outlined" fullWidth margin="normal" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} />
        <Button color="primary" variant="contained" disabled={isProcessing || !folderPath || !id} onClick={handleProcessStart} sx={{ mt: 2 }}>
          Start Processing
        </Button>
        {previousJobs.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Resume Previous Indexing</Typography>
            {previousJobs.map((job) => (
              <Button
                key={job.id}
                variant="outlined"
                onClick={() => handleResumeIndexing(job)}
                sx={{ mt: 1 }}
              >
                Resume: {job.title}
              </Button>
            ))}
          </Box>
        )}
        <ProcessingDialog
          isOpen={isDialogOpen}
          progress={progress}
          metadata={{ title, description }}
          onDismiss={() => setIsDialogOpen(false)}
        />
      </Box>
    </>
  );
}

export default CreateIndex;
