import { Helmet } from 'react-helmet-async';
// @mui
import { Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem, DialogActions, TextField, List, CardHeader, Avatar, ListItem, ListItemText, Button, Container, Grid, Stack, Typography, Card, CardContent, CircularProgress, IconButton, Collapse } from '@mui/material';
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
import { API, graphqlOperation } from 'aws-amplify';
import { useParams } from 'react-router-dom';
import { UploadFile } from '@mui/icons-material';
import Dropzone from 'react-dropzone';
import Iconify from '../components/iconify';

// ----------------------------------------------------------------------


export default function AddToSeriesPage() {
  const { seriesId } = useParams();
  const dropContainer = useRef();

  return (
    <>
      <Helmet>
        <title> Upload to Series - memeSRC Dashboard </title>
      </Helmet>
      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            Upload to Series
          </Typography>
        </Stack>
        <Container>
          <Dropzone onDrop={acceptedFiles => console.log(acceptedFiles)}>
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
        </Container>
      </Container>
    </>
  );
}
