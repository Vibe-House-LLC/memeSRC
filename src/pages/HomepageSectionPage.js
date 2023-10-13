// React
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';

// Amplify
import { API, graphqlOperation } from 'aws-amplify';

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

// DOMPurify
import DOMPurify from 'dompurify';

// Iconify Icons
import Iconify from '../components/iconify';

// GraphQL
import { createHomepageSection, updateHomepageSection, deleteHomepageSection } from '../graphql/mutations';
import { listHomepageSections } from '../graphql/queries';

// Homepage Section Form Components
import ButtonsForm from '../components/homepage-section-forms/ButtonsForm';
import BottomImageForm from '../components/homepage-section-forms/BottomImageForm';
import ButtonSubtextForm from '../components/homepage-section-forms/ButtonSubtextForm';

// ----------------------------------------------------------------------

// Enum for form mode state
const FormMode = {
  CREATE: 'create',
  EDIT: 'edit',
};

// Style for item detail expansion
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

// Function to pull the homepage sections from graphql
async function fetchHomepageSections(items = [], nextToken = null) {
  const result = await API.graphql(
    graphqlOperation(listHomepageSections, {
      filter: {},
      limit: 10,
      nextToken
    })
  );
  const sortedSections = result.data.listHomepageSections.items.sort((a, b) => {
    if (a.index < b.index) return -1;
    if (a.index > b.index) return 1;
    return 0;
  });
  const allItems = [...items, ...sortedSections];
  const newNextToken = result.data.listHomepageSections.nextToken;
  if (newNextToken) {
    return fetchHomepageSections(allItems, newNextToken);
  }
  return allItems;
}

// The HomepageSectionPage component
export default function HomepageSectionPage() {
  // Loading state
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState(FormMode.CREATE);
  const [selectedIndex, setSelectedIndex] = useState(null)

  // Data states
  const [sections, setSections] = useState([]);
  const [id, setId] = useState('');
  const [index, setIndex] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttons, setButtons] = useState([]);
  const [bottomImage, setBottomImage] = useState({});
  const [buttonSubtext, setButtonSubtext] = useState({});
  const [backgroundColor, setBackgroundColor] = useState('');
  const [textColor, setTextColor] = useState('');

  // Expand details state
  const [expanded, setExpanded] = useState(false);

  // Popover state (for edit and delete)
  const [anchorEl, setAnchorEl] = useState(null);

  // Handle detail expansion
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  // Handle show options (edit or delete)
  const handleMoreVertClick = (event, itemIndex) => {
    setSelectedIndex(itemIndex);
    setAnchorEl(event.currentTarget);
  };

  // Handle hide options (edit or delete)
  const handleClose = () => {
    setSelectedIndex(null);
    setAnchorEl(null);
  };

  // Helpers for options display (edit or delete)
  const open = Boolean(anchorEl);
  const popoverId = open ? 'simple-popover' : undefined;

  // Handle showing the main form
  const handleShowForm = () => {
    setShowForm(true);
  };

  // Handle closing the main form
  const handleCloseForm = () => {
    clearForm();
    setShowForm(false);
  };

  // Function to clear the form inputs
  const clearForm = () => {
    setId('');
    setIndex('');
    setTitle('');
    setSubtitle('');
    setButtons([]);
    setBottomImage({});
    setButtonSubtext({});
    setBackgroundColor('');
    setTextColor('');
  };

  // ----------------------------------------------------------------------

  // Function to create new homepage sections
  async function createNewHomepageSection(id, index, title, subtitle, buttons, bottomImage, buttonSubtext, backgroundColor, textColor) {
    const newHomepageSection = {
      input: {
        id,
        index,
        title,
        subtitle,
        buttons: JSON.stringify(buttons),
        bottomImage: JSON.stringify(bottomImage),
        buttonSubtext: JSON.stringify(buttonSubtext),
        backgroundColor,
        textColor
      }
    };

    const result = await API.graphql(graphqlOperation(createHomepageSection, newHomepageSection));
    setSections([...sections, result.data.createHomepageSection])
    clearForm();
    return result.data.createHomepageSection;
  }

  // Function to update existing homepage sections
  async function updateExistingHomepageSection(
    id,
    index,
    title,
    subtitle,
    buttons,
    bottomImage,
    buttonSubtext,
    backgroundColor,
    textColor
  ) {
    const input = {
      id,
      index,
      title,
      subtitle,
      buttons: JSON.stringify(buttons),
      bottomImage: JSON.stringify(bottomImage),
      buttonSubtext: JSON.stringify(buttonSubtext),
      backgroundColor,
      textColor
    };

    const variables = {
      input
    };

    try {
      const result = await API.graphql({ query: updateHomepageSection, variables });
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
      const result = await API.graphql(graphqlOperation(deleteHomepageSection, deletedHomepageSection));
      console.log(result);

      // Update the sections state by filtering out the deleted item
      setSections(sections.filter((item) => item.id !== id));

      return Promise.resolve(result.data.deleteHomepageSection);
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }

  // Function to handle submissions of the form
  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === FormMode.CREATE) {
      createNewHomepageSection(id, index, title, subtitle, buttons, bottomImage, buttonSubtext, backgroundColor, textColor);
    } else {
      updateExistingHomepageSection(id, index, title, subtitle, buttons, bottomImage, buttonSubtext, backgroundColor, textColor);
    }
    clearForm();
    setShowForm(false);
    handleClose();
  };

  // Prepare the editing flow
  const handleEdit = () => {
    // Set the form fields to the values of the item being edited
    const item = sections[selectedIndex];
    console.log(selectedIndex)
    console.log(item)
    setId(item.id);
    setIndex(item.index);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setButtons(JSON.parse(item.buttons));
    setBottomImage(JSON.parse(item.bottomImage));
    setButtonSubtext(JSON.parse(item.buttonSubtext));
    setBackgroundColor(item.backgroundColor);
    setTextColor(item.textColor);

    // Set the form to edit mode
    setMode(FormMode.EDIT);

    // Show the form
    setShowForm(true);
  };

  // Handle deletions of homepage sections
  const handleDelete = () => {
    const item = sections[selectedIndex];
    deleteExistingHomepageSection(item.id)
    handleClose();
  }

  // Pull the homepage sections from GraphQL when the component loads
  useEffect(() => {
    async function getData() {
      const data = await fetchHomepageSections();
      setSections(data);
      setLoading(false);
    }
    getData();
  }, []);

  // Return the contents for the page
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
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} onClick={handleShowForm}>
            New Section
          </Button>
        </Stack>
        <Container>
          <Grid container spacing={2}>
            {(loading) ? "Loading" : sections.map((sectionItem, index) => (
              <Grid item xs={12} sm={6} md={4} key={sectionItem.id}>
                <Card sx={{ maxWidth: 345, '& a': { color: 'white' } }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: sectionItem.backgroundColor }} aria-label="recipe">
                        <img alt="bottom" src={JSON.parse(sectionItem.bottomImage).src} />
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
                    title={sectionItem.title}
                    subheader={
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sectionItem.subtitle ) }} /> // eslint-disable-line react/no-danger
                    }
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
                    <IconButton aria-label="add to favorites">
                      <FavoriteIcon />
                    </IconButton>
                    <IconButton aria-label="share">
                      <ShareIcon />
                    </IconButton>
                    <ExpandMore
                      expand={expanded.toString()}
                      onClick={handleExpandClick}
                      aria-expanded={expanded}
                      aria-label="show more"
                    >
                      <ExpandMoreIcon />
                    </ExpandMore>
                  </CardActions>
                  <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <CardContent>
                      <Typography>{sectionItem.subtitle}</Typography>
                      <Typography>Index: {sectionItem.index}</Typography>
                      <Typography>Buttons: {sectionItem.buttons}</Typography>
                      <Typography>Bottom Image: {sectionItem.bottomImage}</Typography>
                      <Typography>Buttons Subtext: {sectionItem.buttonSubtext}</Typography>
                    </CardContent>
                  </Collapse>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Container>
      <Dialog open={showForm} onClose={handleClose}>
        <DialogTitle>Create Homepage Section</DialogTitle>
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
                  label="Index"
                  fullWidth
                  value={index}
                  onChange={(event) => setIndex(event.target.value)}
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
                <Typography>Buttons:</Typography>
                <ButtonsForm
                  buttons={buttons}
                  setButtons={setButtons}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography>Buttons Subtext:</Typography>
                <ButtonSubtextForm
                  buttonSubtext={buttonSubtext}
                  setButtonSubtext={setButtonSubtext}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography>Bottom Image:</Typography>
                <BottomImageForm
                  bottomImage={bottomImage}
                  setBottomImage={setBottomImage}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Background Color"
                  fullWidth
                  value={backgroundColor}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Text Color"
                  fullWidth
                  value={textColor}
                  onChange={(event) => setTextColor(event.target.value)}
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
