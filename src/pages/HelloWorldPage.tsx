import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Storage } from 'aws-amplify';

type AccessLevel = 'public' | 'protected' | 'private';

const HelloWorldPage: React.FC = () => {
  const [s3Key, setS3Key] = useState<string>('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleViewFile = async () => {
    if (!s3Key.trim()) {
      setError('Please enter an S3 key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setFileUrl(null);

    try {
      const url = await Storage.get(s3Key.trim(), {
        level: accessLevel,
        expires: 3600, // 1 hour
      });
      
      setFileUrl(url);
      setShowPreview(true);
      setSuccess('File URL generated successfully!');
    } catch (err) {
      console.error('Error getting file URL:', err);
      setError(`Failed to get file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!s3Key.trim()) {
      setError('Please enter an S3 key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await Storage.remove(s3Key.trim(), {
        level: accessLevel,
      });
      
      setSuccess('File deleted successfully!');
      setFileUrl(null);
      setShowPreview(false);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(`Failed to delete file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setFileUrl(null);
  };

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
  };

  const isVideo = (url: string) => {
    return /\.(mp4|mov|avi|webm|mkv)$/i.test(url);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom color="primary">
            S3 File Manager
          </Typography>
          <Typography variant="h5" component="p" sx={{ mb: 2 }}>
            View and Delete S3 Files
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter an S3 key and select access level to view or delete files.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="S3 Key"
              variant="outlined"
              value={s3Key}
              onChange={(e) => setS3Key(e.target.value)}
              placeholder="e.g., path/to/your/file.jpg"
              helperText="Enter the full S3 object key (path) to the file"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Access Level</InputLabel>
              <Select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                label="Access Level"
              >
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="protected">Protected</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 2, height: '56px', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleViewFile}
                disabled={loading || !s3Key.trim()}
                sx={{ flex: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'View File'}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteFile}
                disabled={loading || !s3Key.trim()}
                sx={{ flex: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Delete File'}
              </Button>
            </Box>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            </Grid>
          )}

          {success && (
            <Grid item xs={12}>
              <Alert severity="success" onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* File Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          File Preview: {s3Key}
        </DialogTitle>
        <DialogContent>
          {fileUrl && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              {isImage(fileUrl) ? (
                <img
                  src={fileUrl}
                  alt="File preview"
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                />
              ) : isVideo(fileUrl) ? (
                <video
                  src={fileUrl}
                  controls
                  style={{ maxWidth: '100%', maxHeight: '500px' }}
                />
              ) : (
                <Box>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Preview not available for this file type.
                  </Typography>
                  <Button
                    variant="contained"
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in New Tab
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          {fileUrl && (
            <Button
              variant="contained"
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in New Tab
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HelloWorldPage;
