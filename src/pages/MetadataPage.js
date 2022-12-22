import { Helmet } from 'react-helmet-async';
// @mui
import { Button, Container, Grid, Stack, Typography, Modal, Card, CardContent, Box, CircularProgress } from '@mui/material';
// components
import { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import Iconify from '../components/iconify';
import { createContentMetadata, updateContentMetadata, deleteContentMetadata } from '../graphql/mutations';
import { listContentMetadata } from '../graphql/queries';

// ----------------------------------------------------------------------

const FormMode = {
  CREATE: 'create',
  EDIT: 'edit',
};

async function fetchMetadata(items = [], nextToken = null) {
  const result = await API.graphql(
    graphqlOperation(listContentMetadata, {
      filter: {},
      limit: 10,
      nextToken,
    })
  );
  const allItems = [...items, ...result.data.listContentMetadata.items];
  const newNextToken = result.data.listContentMetadata.nextToken;
  if (newNextToken) {
    return fetchMetadata(allItems, newNextToken);
  }
  return allItems;
}

export default function MetadataPage() {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frameCount, setFrameCount] = useState('');
  const [colorMain, setColorMain] = useState('');
  const [colorSecondary, setColorSecondary] = useState('');
  const [emoji, setEmoji] = useState('');
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState(FormMode.CREATE);

  const clearForm = () => {
    setId('');
    setTitle('');
    setDescription('');
    setFrameCount('');
    setColorMain('');
    setColorSecondary('');
    setEmoji('');
    setStatus('');
  };

  // ----------------------------------------------------------------------

  async function createNewContentMetadata(id, title, description, frameCount, colorMain, colorSecondary, emoji, status) {
    const newMetadataItem = {
      input: {
        id,
        title,
        description,
        frameCount,
        colorMain,
        colorSecondary,
        emoji,
        status
      }
    };

    const result = await API.graphql(graphqlOperation(createContentMetadata, newMetadataItem));

    console.log(result)

    setMetadata([...metadata, result.data.createContentMetadata])

    clearForm();

    return result.data.createContentMetadata;
  }

  async function updateExistingContentMetadata(
    id,
    title,
    description,
    frameCount,
    colorMain,
    colorSecondary,
    emoji,
    status
  ) {
    const input = {
      id,
      title,
      description,
      frameCount,
      colorMain,
      colorSecondary,
      emoji,
      status
    };
  
    const variables = {
      input
    };
  
    try {
      const result = await API.graphql({ query: updateContentMetadata, variables });
      console.log(result);
      const updatedMetadata = result.data.updateContentMetadata;
      setMetadata((prevMetadata) =>
        prevMetadata.map((item) => (item.id === id ? updatedMetadata : item))
      );
      return Promise.resolve(updatedMetadata);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }
  
  
  async function deleteExistingContentMetadata(id) {
    const deletedMetadataItem = {
      input: {
        id
      }
    };

    try {
      const result = await API.graphql(graphqlOperation(deleteContentMetadata, deletedMetadataItem));
      console.log(result);

      // Update the metadata state by filtering out the deleted item
      setMetadata(metadata.filter((item) => item.id !== id));

      return Promise.resolve(result.data.deleteContentMetadata);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }




  // ----------------------------------------------------------------------

  const toggleForm = () => {
    setShowForm(!showForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === FormMode.CREATE) {
      createNewContentMetadata(id, title, description, frameCount, colorMain, colorSecondary, emoji, status);
    } else {
      updateExistingContentMetadata(id, title, description, frameCount, colorMain, colorSecondary, emoji, status);
    }
    setShowForm(false);
  };

  const handleEdit = (item) => {
    // Set the form fields to the values of the item being edited
    setId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setFrameCount(item.frameCount);
    setColorMain(item.colorMain);
    setColorSecondary(item.colorSecondary);
    setEmoji(item.emoji);
    setStatus(item.status);
  
    // Set the form to edit mode
    setMode(FormMode.EDIT);
  
    // Show the form
    setShowForm(true);
  };

  useEffect(() => {
    async function getData() {
      const data = await fetchMetadata();
      setMetadata(data);
      setLoading(false);
    }
    getData();
  }, []);

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    backgroundColor: 'white',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  return (
    <>
      <Helmet>
        <title> Metadata Settings - memeSRC Dashboard </title>
      </Helmet>
      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            Metadata Settings {loading ? <CircularProgress size={25} /> : `(${metadata.length})`}
          </Typography>
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={toggleForm}>
            New Content
          </Button>
        </Stack>
        <Container>
          <Grid container spacing={2}>
            {(loading) ? "Loading" : metadata.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h5">{item.title}</Typography>
                    <Typography>{item.description}</Typography>
                    <Typography>Frame Count: {item.frameCount}</Typography>
                    <Typography>Color Main: {item.colorMain}</Typography>
                    <Typography>Color Secondary: {item.colorSecondary}</Typography>
                    <Typography>Emoji: {item.emoji}</Typography>
                    <Typography>Status: {item.status}</Typography>
                  </CardContent>
                  <button type="button" onClick={() => handleEdit(item)}>Edit</button>
                  <button type="button" onClick={() => deleteExistingContentMetadata(item.id)}>Delete</button>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Container>
      <Modal open={showForm}>
        <Box style={style}>
          <Stack>
            <Typography variant="h5">Create New Content Metadata</Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography>ID:</Typography>
                  <input
                    type="text"
                    value={id}
                    onChange={(event) => setId(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Title:</Typography>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Description:</Typography>
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Frame Count:</Typography>
                  <input
                    type="number"
                    value={frameCount}
                    onChange={(event) => setFrameCount(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Color Main:</Typography>
                  <input
                    type="text"
                    value={colorMain}
                    onChange={(event) => setColorMain(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Color Secondary:</Typography>
                  <input
                    type="text"
                    value={colorSecondary}
                    onChange={(event) => setColorSecondary(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Emoji:</Typography>
                  <input
                    type="text"
                    value={emoji} onChange={(event) => setEmoji(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Status:</Typography>
                  <input
                    type="number"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit">Submit</Button>
                </Grid>
              </Grid>
            </form>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
