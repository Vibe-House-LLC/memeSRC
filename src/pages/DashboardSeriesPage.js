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
import { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import Iconify from '../components/iconify';
import { createSeries, updateSeries, deleteSeries } from '../graphql/mutations';
import { listSeries } from '../graphql/queries';

// ----------------------------------------------------------------------

const listSeriesAndSeasons = /* GraphQL */ `
  query ListSeries(
    $filter: ModelSeriesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listSeries(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        tvdbid
        slug
        name
        year
        image
        description
        seasons {
          items {
            id
            tvdbid
            createdAt
            updatedAt
          }
          nextToken
        }
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;

const FormMode = {
  CREATE: 'create',
  EDIT: 'edit',
};

const ExpandMore = styled((props) => {
  const { ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

async function fetchMetadata(items = [], nextToken = null) {
  const result = await API.graphql(
    graphqlOperation(listSeriesAndSeasons, {
      filter: {},
      limit: 10,
      nextToken
    })
  );
  const sortedMetadata = result.data.listSeries.items.sort((a, b) => {
    if (a?.title < b?.title) return -1;
    if (a?.title > b?.title) return 1;
    return 0;
  });
  const allItems = [...items, ...sortedMetadata];
  const newNextToken = result.data.listSeries.nextToken;
  if (newNextToken) {
    return fetchMetadata(allItems, newNextToken);
  }
  return allItems;
}


export default function DashboardSeriesPage() {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [tvdbid, setTvdbid] = useState('');
  const [seriesDescription, setSeriesDescription] = useState('');
  const [mode, setMode] = useState(FormMode.CREATE);
  const [seriesSlug, setSlug] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [seriesYear, setSeriesYear] = useState('');
  const [seriesImage, setSeriesImage] = useState('');
  const [seriesSeasons, setSeriesSeasons] = useState([]);

  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const [selectedIndex, setSelectedIndex] = useState(null)

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleMoreVertClick = (event, itemIndex) => {
    setSelectedIndex(itemIndex);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setSelectedIndex(null);
    setAnchorEl(null);
  };

  const handleCloseForm = () => {
    setShowForm(false)
  };

  const open = Boolean(anchorEl);
  const popoverId = open ? 'simple-popover' : undefined;

  const clearForm = () => {
    setId('');
    setTitle('');
    setTvdbid('');
    setSeriesDescription('');
    setSlug('');
    setSeriesName('');
    setSeriesYear('');
    setSeriesImage('');
    setSeriesSeasons('');
  };

  // ----------------------------------------------------------------------

  async function createNewSeries(seriesData) {

    API.graphql(graphqlOperation(createSeries, {input: seriesData}))
    .then((result) => {
      console.log(result)

      setMetadata([...metadata, result.data.createSeries])
  
      clearForm();
  
      return result.data.createSeries;
    })
    .catch((error) => console.log(error));

    
  }

  async function updateExistingSeries(seriesData) {
    

    try {
      const result = await API.graphql({ query: updateSeries, input: seriesData });
      console.log(result);
      const updatedMetadata = result.data.updateSeries;
      setMetadata((prevMetadata) =>
        prevMetadata.map((item) => (item.id === id ? updatedMetadata : item))
      );
      return Promise.resolve(updatedMetadata);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }


  async function deleteExistingSeries(id) {
    const deletedMetadataItem = {
      input: {
        id
      }
    };

    try {
      const result = await API.graphql(graphqlOperation(deleteSeries, deletedMetadataItem));
      console.log(result);

      // Update the metadata state by filtering out the deleted item
      setMetadata(metadata.filter((item) => item.id !== id));

      return Promise.resolve(result.data.deleteSeries);
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
    const seriesData = {
      tvdbid,
      description: seriesDescription,
      slug: seriesSlug,
      name: seriesName,
      year: parseInt(seriesYear, 10),
      image: seriesImage,
    }
    event.preventDefault();
    if (mode === FormMode.CREATE) {
      createNewSeries(seriesData);
    } else {
      updateExistingSeries(seriesData);
    }
    clearForm();
    setShowForm(false);
    handleClose();
  };

  // const handleEdit = () => {
  //   // Set the form fields to the values of the item being edited
  //   const item = metadata[selectedIndex];
  //   console.log(selectedIndex)
  //   console.log(item)
  //   setId(item.id);
  //   setTitle(item.title);
  //   setDescription(item.description);
  //   setFrameCount(item.frameCount);
  //   setColorMain(item.colorMain);
  //   setColorSecondary(item.colorSecondary);
  //   setEmoji(item.emoji);
  //   setStatus(item.status);

  //   // Set the form to edit mode
  //   setMode(FormMode.EDIT);

  //   // Show the form
  //   setShowForm(true);
  // };

  // const handleDelete = () => {
  //   const item = metadata[selectedIndex];
  //   deleteExistingSeries(item.id)
  //   handleClose();
  // }

  useEffect(() => {
    async function getData() {
      const data = await fetchMetadata();
      setMetadata(data);
      setLoading(false);
    }
    getData();
  }, []);

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
            {/* (loading) ? "Loading" : metadata.map((metadataItem, index) => (
              <Grid item xs={12} sm={6} md={4} key={metadataItem.id}>
                <Card sx={{ maxWidth: 345 }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: grey[200] }} aria-label="recipe">
                        {metadataItem.emoji}
                      </Avatar>
                    }
                    action={
                      <>
                        <IconButton aria-label="settings" onClick={(event) => handleMoreVertClick(event, index)}>
                          <MoreVertIcon />
                        </IconButton>
                      </>
                    }
                    style={{ height: "100px", top: "0" }}
                    title={metadataItem.title}
                    subheader={`${metadataItem.frameCount.toLocaleString('en-US')} frames`}
                  />
                  <Popover
                    id={popoverId}
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    <List>
                      <ListItem button onClick={handleEdit}>
                        <ListItemText primary="Edit" />
                      </ListItem>
                      <ListItem button onClick={handleDelete}>
                        <ListItemText primary="Delete" />
                      </ListItem>
                    </List>
                  </Popover>
                  
                  <CardActions disableSpacing>
                    <IconButton aria-label="add to favorites">
                      <FavoriteIcon />
                    </IconButton>
                    <IconButton aria-label="share">
                      <ShareIcon />
                    </IconButton>
                    <ExpandMore
                      expand={expanded}
                      onClick={handleExpandClick}
                      aria-expanded={expanded}
                      aria-label="show more"
                    >
                      <ExpandMoreIcon />
                    </ExpandMore>
                  </CardActions>
                  <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <CardContent>
                      <Typography>{metadataItem.description}</Typography>
                      <Typography>Frame Count: {metadataItem.frameCount}</Typography>
                      <Typography>Color Main: {metadataItem.colorMain}</Typography>
                      <Typography>Color Secondary: {metadataItem.colorSecondary}</Typography>
                      <Typography>Emoji: {metadataItem.emoji}</Typography>
                      <Typography>Status: {metadataItem.status}</Typography>
                    </CardContent>
                  </Collapse>
                </Card>
              </Grid>
                  )) */}

                  
          </Grid>
        </Container>
      </Container>
      {/* <button type="button" onClick={() => handleEdit(item)}>Edit</button>
                  <button type="button" onClick={() => deleteExistingSeries(item.id)}>Delete</button> */}
      <Dialog open={showForm} onClose={handleClose}>
        <DialogTitle>Create New Content Metadata</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="ID"
                  fullWidth
                  value={id}
                  onChange={(event) => setId(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="TVDB ID"
                  fullWidth
                  value={tvdbid}
                  onChange={(event) => setTvdbid(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Slug"
                  fullWidth
                  value={seriesSlug}
                  onChange={(event) => setSlug(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Name"
                  fullWidth
                  value={seriesName}
                  onChange={(event) => setSeriesName(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Year"
                  type='number'
                  fullWidth
                  value={seriesYear}
                  onChange={(event) => setSeriesYear(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Image"
                  fullWidth
                  value={seriesImage}
                  onChange={(event) => setSeriesImage(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  value={seriesDescription}
                  onChange={(event) => setSeriesDescription(event.target.value)}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
