import { useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, CardActionArea, Grid, Paper, Input, Chip, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import BasePage from './BasePage';
import { LibraryPickerDialog } from '../components/library';
import { UserContext } from '../UserContext';
import { get as getFromLibrary } from '../utils/library/storage';

export default function EditorNewProjectPage() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [uploadChoiceOpen, setUploadChoiceOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef(null);
  const isAuthenticated = Boolean(user && user !== false);

  const resetUploadState = () => {
    setUploadChoiceOpen(false);
    setPendingUpload(null);
    setLibraryOpen(false);
    if (fileInputRef.current?.value) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      const inputEl = event.target;
      reader.onloadend = async () => {
        const base64data = reader.result;
        if (typeof base64data === 'string') {
          setPendingUpload(base64data);
          setUploadChoiceOpen(true);
          if (inputEl?.value) {
            inputEl.value = '';
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLibrarySelect = async (items) => {
    const selected = items?.[0];
    if (!selected) return;
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    let image = selected.displayUrl || selected.originalUrl;
    const key = selected?.metadata?.libraryKey;
    if (key) {
      try {
        const blob = await getFromLibrary(key, { level: 'private' });
        image = await toDataUrl(blob);
      } catch (e) {
        image = selected.displayUrl || selected.originalUrl;
      }
    }
    setPendingUpload(image);
    setUploadChoiceOpen(true);
    setLibraryOpen(false);
  };

  const handleOpenAdvancedEditor = () => {
    if (!pendingUpload) return;
    navigate('/editor/project/new', { state: { uploadedImage: pendingUpload } });
    resetUploadState();
  };

  const handleOpenMagicEditor = () => {
    if (!pendingUpload) return;
    navigate('/magic', { state: { initialSrc: pendingUpload } });
    resetUploadState();
  };

  // Rest of your component rendering logic remains the same...
  return (
    <BasePage
      pageTitle="Meme Tools"
      breadcrumbLinks={[
        { path: "/", name: "Home" },
        { name: "Editor" },
        // { path: "/editor/new", name: "New" }
      ]}
    >
  <Container sx={{ padding: 0 }}> {/* Adjust padding here */}
    {/* New Feature Description */}
    <Alert severity="success" sx={{ mb: -4, mt: -2 }}> {/* Adjust margin here */}
      <b>New:</b> Check out the Collage tool (early access)!
    </Alert>
  </Container>
      <Grid container justifyContent="center" spacing={2} sx={{ mt: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <CardActionArea component="div" onClick={(e) => {
              e.preventDefault();
              if (isAuthenticated) {
                setLibraryOpen(true);
              } else {
                fileInputRef.current?.click();
              }
            }}>
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
                <CloudUploadIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" component="div" gutterBottom>
                  Upload Image
                </Typography>
                <Typography color="text.secondary">
                  {isAuthenticated ? 'Pick from Library or upload' : 'Choose your own image'}
                </Typography>
              </Paper>
            </CardActionArea>
            <Input
              type="file"
              inputProps={{ accept: 'image/png, image/jpeg' }}
              style={{ display: 'none' }}
              onChange={handleImageUpload}
              inputRef={fileInputRef}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4} lg={3}>
          <CardActionArea onClick={() => navigate('/collage')}>
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
               <Chip 
                    label="Early Access!" 
                    color="success" 
                    size="small"
                    sx={{ 
                      position: 'absolute',
                      top: 20,
                      left: 20,
                      fontWeight: 'bold'
                    }} 
                  />
              <PhotoLibraryIcon sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" component="div" gutterBottom>
                Create Collage
              </Typography>
              <Typography color="text.secondary">Combine multiple images</Typography>
            </Paper>
          </CardActionArea>
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
                <Typography color="text.secondary">Find 85 million+ on memeSRC</Typography>
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
        <Dialog
          open={uploadChoiceOpen}
          onClose={resetUploadState}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 800 }}>
            Open image in…
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Choose where to edit your uploaded image.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Stack spacing={1.25} sx={{ width: '100%' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleOpenAdvancedEditor}
              >
                Advanced Editor
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleOpenMagicEditor}
              >
                Magic Editor
              </Button>
              <Button onClick={resetUploadState} size="large" color="inherit">
                Cancel
              </Button>
            </Stack>
          </DialogActions>
        </Dialog>
        <LibraryPickerDialog
          open={libraryOpen}
          onClose={resetUploadState}
          title="Choose a photo from your Library"
          onSelect={handleLibrarySelect}
          browserProps={{
            multiple: false,
            uploadEnabled: true,
            deleteEnabled: false,
            showActionBar: false,
            selectionEnabled: true,
            previewOnClick: true,
            showSelectToggle: true,
            initialSelectMode: true,
          }}
        />
        </BasePage>
  );
}
