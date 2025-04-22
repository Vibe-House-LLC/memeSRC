import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import DOMPurify from 'dompurify';

// MUI Components
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  List, 
  CardHeader, 
  Avatar, 
  ListItem, 
  ListItemText, 
  Button, 
  Container, 
  Grid, 
  Stack, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  IconButton, 
  Collapse,
  Popover,
  CardActions
} from '@mui/material';

// MUI Styles
import { styled } from '@mui/material/styles';

// MUI Icons
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Iconify Icons
import Iconify from '../components/iconify';

// GraphQL
import { createHomepageSection, updateHomepageSection, deleteHomepageSection } from '../graphql/mutations';
import { listHomepageSections } from '../graphql/queries';

// Homepage Section Form Components
import ButtonsForm from '../components/homepage-section-forms/ButtonsForm';
import BottomImageForm from '../components/homepage-section-forms/BottomImageForm';
import ButtonSubtextForm from '../components/homepage-section-forms/ButtonSubtextForm';

// Initialize API client
const client = generateClient();

// ----------------------------------------------------------------------

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

async function fetchHomepageSections(items = [], nextToken = null) {
  const result = await client.graphql({
    query: listHomepageSections,
    variables: {
      filter: {},
      limit: 10,
      nextToken
    },
    authMode: 'awsIam'
  });
  // Extract and sort homepage sections
  const sortedSections = result.data.listHomepageSections.items.sort((a, b) => {
    if (a.order < b.order) return -1;
    if (a.order > b.order) return 1;
    return 0;
  });
  const allItems = [...items, ...sortedSections];
  const newNextToken = result.data.listHomepageSections.nextToken;
  if (newNextToken) {
    return fetchHomepageSections(allItems, newNextToken);
  }
  return allItems;
}


export default function HomepageSectionPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [bottomImage, setBottomImage] = useState('');
  const [buttons, setButtons] = useState([]);
  const [mode, setMode] = useState(FormMode.CREATE);

  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const [selectedIndex, setSelectedIndex] = useState(null);

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
    setShowForm(false);
  };

  const open = Boolean(anchorEl);
  const popoverId = open ? 'simple-popover' : undefined;

  const clearForm = () => {
    setId('');
    setTitle('');
    setSubtitle('');
    setDescription('');
    setOrder('');
    setBackgroundImage('');
    setBottomImage('');
    setButtons([]);
  };

  // ----------------------------------------------------------------------

  // Function to create new homepage sections
  async function createNewHomepageSection(
    id,
    title,
    subtitle,
    description,
    order,
    backgroundImage,
    bottomImage,
    buttons
  ) {
    const newHomepageSection = {
      input: {
        id,
        title,
        subtitle,
        description,
        order,
        backgroundImage,
        bottomImage,
        buttons
      }
    };

    const result = await client.graphql({
      query: createHomepageSection,
      variables: newHomepageSection,
      authMode: 'awsIam'
    });

    console.log(result);

    setSections([...sections, result.data.createHomepageSection]);

    clearForm();

    return result.data.createHomepageSection;
  }

  // Function to update existing homepage sections
  async function updateExistingHomepageSection(
    id,
    title,
    subtitle,
    description,
    order,
    backgroundImage,
    bottomImage,
    buttons
  ) {
    const input = {
      id,
      title,
      subtitle,
      description,
      order,
      backgroundImage,
      bottomImage,
      buttons
    };

    const variables = {
      input
    };

    try {
      const result = await client.graphql({
        query: updateHomepageSection,
        variables,
        authMode: 'awsIam'
      });
      console.log(result);
      const updatedHomepageSection = result.data.updateHomepageSection;
      setSections((prevMetadata) =>
        prevMetadata.map((item) => (item.id === id ? updatedHomepageSection : item))
      );
      return Promise.resolve(updatedHomepageSection);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }

  // Function to delete existing homepage sections
  async function deleteExistingHomepageSection(id) {
    const deletedHomepageSection = {
      input: {
        id
      }
    };
    try {
      const result = await client.graphql({
        query: deleteHomepageSection,
        variables: deletedHomepageSection,
        authMode: 'awsIam'
      });
      console.log(result);

      // Update the sections state by filtering out the deleted item
      setSections(sections.filter((item) => item.id !== id));

      return Promise.resolve(result.data.deleteHomepageSection);
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
    console.log("Button data to be submitted:", buttons);

    if (mode === FormMode.CREATE) {
      createNewHomepageSection(
        id,
        title,
        subtitle,
        description,
        parseFloat(order),
        backgroundImage,
        bottomImage,
        buttons
      );
    } else {
      updateExistingHomepageSection(
        id,
        title,
        subtitle,
        description,
        parseFloat(order),
        backgroundImage,
        bottomImage,
        buttons
      );
    }
    clearForm();
    setShowForm(false);
    handleClose();
  };

  const handleEdit = () => {
    // Set the form fields to the values of the item being edited
    const item = sections[selectedIndex];
    console.log(selectedIndex);
    console.log(item);
    setId(item.id);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setDescription(item.description);
    setOrder(String(item.order));
    setBackgroundImage(item.backgroundImage);
    setBottomImage(item.bottomImage);
    setButtons(item.buttons || []);

    // Set the form to edit mode
    setMode(FormMode.EDIT);

    // Show the form
    setShowForm(true);
  };

  const handleDelete = () => {
    const item = sections[selectedIndex];
    deleteExistingHomepageSection(item.id);
    handleClose();
  };

  useEffect(() => {
    async function getData() {
      const data = await fetchHomepageSections();
      setSections(data);
      setLoading(false);
    }
    getData();
  }, []);

  return (
    <>
      <Helmet>
        <title> Homepage Sections - memeSRC Dashboard </title>
      </Helmet>
      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            Homepage Sections {loading ? <CircularProgress size={25} /> : `(${sections.length})`}
          </Typography>
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={toggleForm}>
            New Section
          </Button>
        </Stack>
        <Container>
          <Grid container spacing={2}>
            {loading ? (
              "Loading"
            ) : (
              sections.map((section, index) => (
                <Grid item xs={12} key={section.id}>
                  <Card>
                    <CardHeader
                      avatar={
                        <Avatar aria-label="order">
                          {section.order}
                        </Avatar>
                      }
                      action={
                        <>
                          <IconButton aria-label="settings" onClick={(event) => handleMoreVertClick(event, index)}>
                            <MoreVertIcon />
                          </IconButton>
                        </>
                      }
                      title={section.title}
                      subheader={section.subtitle}
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
                        <ListItem button onClick={handleEdit} key="edit">
                          <ListItemText primary="Edit" />
                        </ListItem>
                        <ListItem button onClick={handleDelete} key="delete">
                          <ListItemText primary="Delete" />
                        </ListItem>
                      </List>
                    </Popover>
                    <CardActions disableSpacing>
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
                        <Typography paragraph>Description:</Typography>
                        <Typography paragraph>
                          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.description) }} />
                        </Typography>
                        <Typography>Background Image: {section.backgroundImage}</Typography>
                        <Typography>Bottom Image: {section.bottomImage}</Typography>
                        {section.buttons && section.buttons.length > 0 && (
                          <>
                            <Typography paragraph>Buttons:</Typography>
                            {section.buttons.map((button, idx) => (
                              <Typography key={idx} paragraph>
                                Text: {button.text}, Link: {button.link}{button.subtext && `, Subtext: ${button.subtext}`}
                              </Typography>
                            ))}
                          </>
                        )}
                      </CardContent>
                    </Collapse>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Container>
      </Container>

      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
        <DialogTitle>{mode === FormMode.CREATE ? 'Create New Homepage Section' : 'Edit Homepage Section'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="ID"
                  fullWidth
                  value={id}
                  onChange={(event) => setId(event.target.value)}
                  disabled={mode === FormMode.EDIT}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  fullWidth
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Subtitle"
                  fullWidth
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description (HTML allowed)"
                  fullWidth
                  multiline
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Order"
                  fullWidth
                  type="number"
                  value={order}
                  onChange={(event) => setOrder(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Background Image URL"
                  fullWidth
                  value={backgroundImage}
                  onChange={(event) => setBackgroundImage(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <BottomImageForm 
                  bottomImage={bottomImage} 
                  setBottomImage={setBottomImage} 
                />
              </Grid>
              <Grid item xs={12}>
                <ButtonsForm 
                  buttons={buttons} 
                  setButtons={setButtons} 
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary">
            {mode === FormMode.CREATE ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}