import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack } from '@mui/material';
import { Add } from '@mui/icons-material';
import ProjectPicker from '../components/collage/components/ProjectPicker';
import { loadProjects, deleteProject as deleteProjectRecord } from '../components/collage/utils/projects';
import type { CollageProject } from '../types/collage';
import { UserContext } from '../UserContext';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CollageProject[]>([]);
  const { user } = useContext(UserContext);

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
    <Container sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<Add />}
          onClick={() => navigate('/projects/new')}
          sx={{ fontWeight: 700, textTransform: 'none', py: 1.25 }}
        >
          New Collage
        </Button>
        <Box sx={{ flex: 1 }} />
      </Stack>
      <ProjectPicker projects={projects} onOpen={handleOpen} onDelete={handleDelete} />
    </Container>
  );
}
