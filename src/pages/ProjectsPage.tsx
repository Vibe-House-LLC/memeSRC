import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Add } from '@mui/icons-material';
import ProjectPicker from '../components/collage/components/ProjectPicker';
import { loadProjects, deleteProject as deleteProjectRecord } from '../components/collage/utils/projects';
import type { CollageProject } from '../types/collage';
import { UserContext } from '../UserContext';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CollageProject[]>([]);
  const { user } = useContext(UserContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isAdmin = user?.['cognito:groups']?.includes('admins');

  // Gate this page for non-admins; redirect to single-page collage
  useEffect(() => {
    if (!isAdmin) {
      navigate('/collage', { replace: true });
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    setProjects(loadProjects());
    const onFocus = () => setProjects(loadProjects());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleOpen = useCallback((id: string) => {
    navigate(`/projects/${id}`);
  }, [navigate]);

  const handleDelete = useCallback((id: string) => {
    deleteProjectRecord(id);
    setProjects(loadProjects());
  }, []);

  return (
    <Container
      maxWidth="md"
      sx={{
        p: { xs: 1, sm: 2 },
        pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', sm: 12 },
      }}
    >
      {!isMobile && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Add />}
            onClick={() => navigate('/projects/new')}
            sx={{ fontWeight: 700, textTransform: 'none', py: 1.25 }}
            aria-label="Create a new meme"
          >
            New Meme
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>
      )}
      <ProjectPicker projects={projects} onOpen={handleOpen} onDelete={handleDelete} />

      {/* Bottom Action Bar (mobile-first, consistent with editor) */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1600,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: isMobile ? 1.5 : 2,
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1.5,
        }}
        role="toolbar"
      >
        <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 960, alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/projects/new')}
            sx={{
              flex: 1,
              minHeight: 48,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
              border: '1px solid #8b5cc7',
              boxShadow: '0 6px 20px rgba(139, 92, 199, 0.4)',
              color: '#fff',
              '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' }
            }}
            startIcon={<Add />}
            aria-label="Create a new meme"
          >
            New Meme
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
