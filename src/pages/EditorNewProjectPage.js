import { API, graphqlOperation, Storage } from 'aws-amplify';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Breadcrumbs, Link, Card, CardActionArea, CardContent, Box, Grid, Paper, Input, Chip, Alert } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BasePage from './BasePage';
import { createEditorProject } from '../graphql/mutations';

export default function EditorNewProjectPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const navigate = useNavigate();

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async function() {
        const base64data = reader.result;
        setUploadedImage(base64data);
  
        // Create an EditorProject object in GraphQL with an empty state value
        try {
          // TODO: consider uploading to S3 and doing the project loading/saving stuff. 
          // const projectInput = {
          //   title: "Same Project Saving",
          //   state: JSON.stringify({}) // empty state value
          // };
  
          // const result = await API.graphql(graphqlOperation(createEditorProject, { input: projectInput }));
          // const newProjectId = result.data.createEditorProject.id;

          // // Upload 'preview' to Storage
          // const key = `projects/${newProjectId}-preview.jpg`;
          // await Storage.put(key, file, {
          //   level: 'protected', 
          //   contentType: file.type
          // });

          // // Navigate to the editor with the newProjectId while passing the uploaded image data
          // navigate(`/editor/project/${newProjectId}`, { state: { uploadedImage: base64data } });

          navigate(`/editor/project/new`, { state: { uploadedImage: base64data } });
  
        } catch (error) {
          console.error('Failed to create an EditorProject or upload to Storage:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Rest of your component rendering logic remains the same...
  return (
    <BasePage
      pageTitle="New Project"
      breadcrumbLinks={[
        { path: "/", name: "Home" },
        { name: "Editor" },
        // { path: "/editor/new", name: "New" }
      ]}
    >
  <Container sx={{ padding: 0 }}> {/* Adjust padding here */}
    {/* New Feature Description */}
    <Alert severity="success" sx={{ mb: -4, mt: -2 }}> {/* Adjust margin here */}
      You can now edit your own photos with the advanced editor, including <b>Magic Tools</b>!
    </Alert>
  </Container>
      <Grid container justifyContent="center" spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <label htmlFor="upload-image" style={{ width: '100%', cursor: 'pointer' }}>
              <CardActionArea component="div">
                <Paper
                  elevation={6}
                  sx={{
                    p: 3,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <Chip 
                    label="New!" 
                    color="success" 
                    size="small"
                    sx={{ 
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      fontWeight: 'bold'
                    }} 
                  />
                  <CloudUploadIcon sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="h5" component="div" gutterBottom>
                    Upload Image
                  </Typography>
                  <Typography color="text.secondary">Choose your own image</Typography>
                </Paper>
              </CardActionArea>
              {/* Hidden input for the image upload */}
              <Input
                type="file"
                id="upload-image"
                inputProps={{ accept: "image/png, image/jpeg" }}
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
                position: 'relative', // Make Paper position relative
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                opacity: 0.5,
              }}
            >
              <Chip 
                label="coming soon" 
                color="info" 
                size="small"
                sx={{ 
                  position: 'absolute', // Position chip absolutely
                  top: 20,  // Adjust as needed
                  left: 20, // Adjust as needed
                  fontWeight: 'bold'
                }} 
              />
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
