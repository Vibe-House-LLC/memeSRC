import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import LibraryBrowser from '../components/library/LibraryBrowser';
import { UserContext } from '../UserContext';

export default function LibraryPage() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');

  if (!isAdmin) {
    return <Navigate to="/404" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
        Photo Library
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Upload, preview, and manage photos in your protected library.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <LibraryBrowser
          isAdmin
          multiple
          storageLevel="protected"
          uploadEnabled
          deleteEnabled
          onSelect={() => {}}
          showActionBar={false}
          showSelectToggle
          initialSelectMode={false}
        />
      </Box>
    </Container>
  );
}


