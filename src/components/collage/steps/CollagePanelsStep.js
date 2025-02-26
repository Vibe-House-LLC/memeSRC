import { Box, Button, Typography } from "@mui/material";
import { KeyboardArrowLeft, ArrowForward, Info } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

// Create a new styled component for the action buttons container
const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(3),
}));

const CollagePanelsStep = ({ handleBack, handleCreateCollage, selectedTemplate }) => {
  return (
    <>
      <Typography variant="body1" paragraph>
        Choose which photos go in which panels. You can drag and drop images between panels.
      </Typography>

      <Box 
        sx={{ 
          border: theme => `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
          padding: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          mb: 3
        }}
      >
        <Info sx={{ fontSize: 40, mb: 2, color: 'text.secondary' }} />
        <Typography variant="h6" gutterBottom textAlign="center">
          Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth="600px">
          In the future, you'll be able to rearrange your images and choose which photos go in which panels of your layout.
          For now, we'll automatically arrange your images in the best way possible.
        </Typography>
      </Box>
      
      <ActionButtonsContainer>
        <Button onClick={handleBack} startIcon={<KeyboardArrowLeft />}>
          Back to Settings
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateCollage}
          endIcon={<ArrowForward />}
          disabled={!selectedTemplate}
        >
          Create Collage
        </Button>
      </ActionButtonsContainer>
    </>
  );
};

export default CollagePanelsStep; 