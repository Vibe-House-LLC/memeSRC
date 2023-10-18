import { Storage } from 'aws-amplify';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Breadcrumbs, Link, Card, CardActionArea, CardContent, Box, Grid, Paper, Input } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BasePage from './BasePage';

export default function EditorNewProjectPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const navigate = useNavigate();

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // Upload to S3 in the public directory
        const result = await Storage.put(file.name, file, {
          level: 'public',
          contentType: file.type
        });
        const url = await Storage.get(result.key);
        setUploadedImage(url);
        console.log(url)
        navigate('/editor', { state: { uploadedImage: url } });
      } catch (error) {
        console.error("Error uploading file: ", error);
      }
    }
  };

  return (
    <BasePage
      pageTitle="New Project"
      breadcrumbLinks={[
        { path: "/", name: "Home" },
        { path: "/editor/", name: "Editor" },
        { path: "/editor/new", name: "New" }
      ]}
    >
      <Grid container justifyContent="center" spacing={2} sx={{ mt: 4 }}>
      <Grid item xs={12} sm={6} md={4} lg={3}>
  <label htmlFor="upload-image" style={{ width: '100%', cursor: 'pointer' }}>
    <Paper
      elevation={6}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <CloudUploadIcon sx={{ fontSize: 60, mb: 2 }} />
      <Typography variant="h5" component="div" gutterBottom>
        Upload Image
      </Typography>
      <Typography color="text.secondary">Choose your own image</Typography>
    </Paper>
    {/* Hidden input for the image upload */}
    <Input
      type="file"
      id="upload-image"
      style={{ display: 'none' }}
      onChange={handleImageUpload}
    />
  </label>
</Grid>

          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Paper
              elevation={6}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <SearchIcon sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" component="div" gutterBottom>
                Search Images
              </Typography>
              <Typography color="text.secondary">Find 35 million on memeSRC</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Paper
              elevation={6}
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <AutoFixHighIcon sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" component="div" gutterBottom>
                Generate Image
              </Typography>
              <Typography color="text.secondary">Using memeSRC Magic</Typography>
            </Paper>
          </Grid>
        </Grid>
        </BasePage>
  );
}
