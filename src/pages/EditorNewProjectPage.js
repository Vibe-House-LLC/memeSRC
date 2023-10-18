import { useState } from 'react';
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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = function() {
        const base64data = reader.result;
        setUploadedImage(base64data);
        console.log(base64data)
        navigate('/editor', { state: { uploadedImage: base64data } });
      }
      reader.readAsDataURL(file);
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
            <CardActionArea onClick={() => navigate('/')}>
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
            </CardActionArea>
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
