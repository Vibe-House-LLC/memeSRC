import { useContext } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { get as getFromLibrary } from '../utils/library/storage';
import LibraryBrowser from '../components/library/LibraryBrowser';
import { UserContext } from '../UserContext';

export default function LibraryPage() {
  const { user } = useContext(UserContext);
  const isAuthLoading = typeof user === 'undefined' || user === null;
  const isAuthenticated = Boolean(user && user !== false);
  const isAdmin = isAuthenticated && user?.['cognito:groups']?.includes('admins');
  const isPro = isAuthenticated && user?.userDetails?.magicSubscription === 'true';
  const navigate = useNavigate();

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow admins and Pro users; if logged in but non-Pro, forward to /pro
  if (!isAdmin && !isPro) {
    return <Navigate to="/pro" replace />;
  }

  return (
    <>
      <Helmet>
        <title> Library • memeSRC </title>
      </Helmet>
      <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
        Library
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Upload, browse, and manage your saved photos.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <LibraryBrowser
          multiple
          storageLevel="private"
          uploadEnabled
          deleteEnabled
          onSelect={() => {}}
          showActionBar
          actionBarLabel="Create Collage"
          minSelected={2}
          onActionBarPrimary={async ({ selectedItems, storageLevel, clear }) => {
            const toDataUrl = (blob) => new Promise((resolve, reject) => {
              try {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              } catch (e) { reject(e); }
            });

            try {
              const images = await Promise.all((selectedItems || []).map(async (it) => {
                try {
                  const blob = await getFromLibrary(it.key, { level: storageLevel || 'private' });
                  const dataUrl = await toDataUrl(blob);
                  return {
                    originalUrl: dataUrl,
                    displayUrl: dataUrl,
                    metadata: { isFromLibrary: true, libraryKey: it.key },
                  };
                } catch (_) {
                  // Fallback to signed URL if blob fetch fails
                  return {
                    originalUrl: it.url,
                    displayUrl: it.url,
                    metadata: { isFromLibrary: true, libraryKey: it.key },
                  };
                }
              }));
              navigate('/collage', { state: { fromCollage: true, images } });
            } finally {
              try { clear(); } catch (_) { /* ignore */ }
            }
          }}
          showSelectToggle
          initialSelectMode={false}
        />
      </Box>
      </Container>
    </>
  );
}
