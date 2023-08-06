import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Breadcrumbs, Link, Card, CardActionArea, CardContent, Box, Grid, Paper } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BasePage from './BasePage';

export default function EditorNewProjectPage() {
  // Add more states and functions according to your requirements.
  // These will be used to hold and handle data for your new page.

  // useState declarations here

  useEffect(() => {
    // Any initial data loading operations can go here.

    // API calls here
  }, []);

  return (
    <BasePage
    pageTitle="New Project"
    breadcrumbLinks={[
      { path: "/", name: "Home" },
      { path: "/editor/new", name: "Editor" },
      { path: "/editor/new", name: "New" }
    ]}
  >
    <Grid container justifyContent="center" spacing={2} sx={{ mt: 4 }}>
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
              <CloudUploadIcon sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" component="div" gutterBottom>
                Upload Image
              </Typography>
              <Typography color="text.secondary">Choose your own image</Typography>
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
