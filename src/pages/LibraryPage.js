import { useContext, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { get as getFromLibrary } from '../utils/library/storage';
import LibraryBrowser from '../components/library/LibraryBrowser';
import { UserContext } from '../UserContext';

export default function LibraryPage() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const navigate = useNavigate();
  const location = useLocation();
  const preselectKeys = Array.isArray(location.state?.preselectKeys) ? location.state.preselectKeys : [];
  const initialSelectMode = Boolean(location.state?.initialSelectMode);

  // After applying preselection, clear navigation state to avoid reapplying on refresh
  useEffect(() => {
    if (preselectKeys.length > 0 || initialSelectMode) {
      // Use a microtask to ensure child reads props first
      Promise.resolve().then(() => {
        navigate(location.pathname, { replace: true, state: {} });
      });
    }
    // Only run when the incoming state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
                  const blob = await getFromLibrary(it.key, { level: storageLevel || 'protected' });
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
              navigate('/collage', { state: { fromCollage: true, from: 'library', images, libraryKeys: (selectedItems || []).map((it) => it.key) } });
            } finally {
              try { clear(); } catch (_) { /* ignore */ }
            }
          }}
          showSelectToggle
          initialSelectMode={initialSelectMode}
          initialSelectedKeys={preselectKeys}
        />
      </Box>
    </Container>
  );
}
