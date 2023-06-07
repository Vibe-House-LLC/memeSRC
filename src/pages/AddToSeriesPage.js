import { Helmet } from 'react-helmet-async';
// @mui
import { Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, DialogActions, TextField, List, CardHeader, Avatar, ListItem, ListItemText, Button, Container, Grid, Stack, Typography, Card, CardContent, CircularProgress, IconButton, Collapse, Backdrop } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Popover from '@mui/material/Popover';
import { grey } from '@mui/material/colors';
import CardActions from '@mui/material/CardActions';
import { styled } from '@mui/material/styles';
// components
import { useState, useEffect, useRef } from 'react';
import { API, Storage, graphqlOperation } from 'aws-amplify';
import { useParams } from 'react-router-dom';
import { UploadFile } from '@mui/icons-material';
import Dropzone from 'react-dropzone';
import { LoadingButton } from '@mui/lab';
import { getSeries } from '../graphql/queries';
import { createSourceMedia, createFile } from '../graphql/mutations';
import Iconify from '../components/iconify';

// ----------------------------------------------------------------------


export default function AddToSeriesPage() {
  const { seriesId } = useParams();
  const dropContainer = useRef();
  const [files, setFiles] = useState();
  const [series, setSeries] = useState();
  const [uploading, setUploading] = useState(false);

  function filterFiles(files) {
    const validPaths = ["/src/media", "/src/subs", "/subs", "/media"];

    return files.filter(file => {
      const filePath = file.path.toLowerCase();
      return validPaths.some(path => filePath.startsWith(path));
    });
  }

  const handleAddFiles = files => {
    console.log(files)
    setFiles(filterFiles(files))
  }

  const handleUpload = async () => {
    setUploading(true)
    try {
      const uploadPromises = files.map(async (file) => {
        console.log(`Attempting to upload ${file.name}...`);
        const key = await Storage.put(file.name, file, {
          contentType: file.type,
          level: 'protected'
        });
        console.log(`${file.name} uploaded!`);
        console.log(key);
      });
  
      await Promise.all(uploadPromises);
      console.log("All files uploaded successfully!");
      setUploading(false);
  
    } catch (error) {
      console.log("Error uploading files: ", error);
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!series) {
      API.graphql(
        graphqlOperation(getSeries, { id: seriesId })
      ).then(response => {
        setSeries(response.data.getSeries);
      }).catch(err => console.log(err))
    }
  }, []);

  return (
    <>
      <Helmet>
        <title> Upload {series?.name ? `to ${series.name}` : 'loading...'} - memeSRC Dashboard </title>
      </Helmet>
      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            {series?.name ? `Upload to ${series.name}` : 'loading...'}
          </Typography>
        </Stack>
        <Container>
          <Dropzone onDrop={acceptedFiles => { handleAddFiles(acceptedFiles) }}>
            {({ getRootProps, getInputProps }) => (
              <Card
                {...getRootProps()}
                sx={{
                  width: '100%',
                  py: 10,
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
                <input {...getInputProps()} />
                <Stack alignItems='center' spacing={2} ref={dropContainer}>
                  <UploadFile sx={{ fontSize: 80 }} />
                  <Typography variant='h4'>
                    Drag and drop folder
                  </Typography>
                </Stack>
              </Card>
            )}

          </Dropzone>
          <LoadingButton
            fullWidth
            variant='contained'
            size='large'
            sx={{ my: 3 }}
            disabled={!files}
            onClick={handleUpload}
          >
            Upload
          </LoadingButton>
          {files?.map(file => <>{JSON.stringify(file)}<br /></>)}
        </Container>
      </Container>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={!series}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
