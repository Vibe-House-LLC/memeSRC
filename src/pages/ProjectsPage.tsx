import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Add } from '@mui/icons-material';
import ProjectPicker from '../components/collage/components/ProjectPicker';
import { loadProjects, deleteProject as deleteProjectRecord, subscribeToTemplates } from '../components/collage/utils/templates';
import type { CollageProject } from '../types/collage';
import { UserContext } from '../UserContext';
import { normalizeString } from '../utils/search/normalize';
import { getMetadataForKey, DEFAULT_LIBRARY_METADATA } from '../utils/library/metadata';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CollageProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [metaByKey, setMetaByKey] = useState<Record<string, { tags: string[]; description: string; defaultCaption: string }>>({});
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
    const unsubscribe = subscribeToTemplates((next) => {
      setProjects(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchProjects = async (options?: { forceRefresh?: boolean }) => {
      try {
        const next = await loadProjects(options);
        if (mounted) setProjects(next);
      } catch (err) {
        if (mounted && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[ProjectsPage] Failed to load templates', err);
        }
      }
    };
    fetchProjects();
    const onFocus = () => { void fetchProjects({ forceRefresh: true }); };
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [loadProjects]);

  // Background fetch default captions for images referenced by projects
  useEffect(() => {
    let cancelled = false;
    const allKeys = Array.from(new Set(
      projects
        .flatMap((p) => (p?.state?.images || []) as any[])
        .map((img) => (img && typeof img === 'object' ? (img as any).libraryKey : null))
        .filter((k): k is string => Boolean(k))
    ));
    const missing = allKeys.filter((k) => !(k in metaByKey));
    if (missing.length === 0) return undefined;
    const worker = async () => {
      const pool = Math.min(4, missing.length);
      await Promise.all(
        Array.from({ length: pool }, async (_, wi) => {
          for (let idx = wi; idx < missing.length; idx += pool) {
            const k = missing[idx];
            try {
              const meta = await getMetadataForKey(k, { level: 'private' });
              if (!cancelled) setMetaByKey((prev) => (prev[k] ? prev : { ...prev, [k]: meta }));
            } catch (_) {
              if (!cancelled) setMetaByKey((prev) => (prev[k] ? prev : { ...prev, [k]: { ...DEFAULT_LIBRARY_METADATA } }));
            }
          }
        })
      );
    };
    worker();
    return () => { cancelled = true; };
  }, [projects, metaByKey]);

  const handleOpen = useCallback((id: string) => {
    navigate(`/projects/${id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteProjectRecord(id);
      const next = await loadProjects({ forceRefresh: true });
      setProjects(next);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[ProjectsPage] Failed to delete template', err);
      }
    }
  }, [loadProjects, deleteProjectRecord]);

  const normalizedQuery = React.useMemo(() => normalizeString(searchQuery), [searchQuery]);

  const filteredProjects = React.useMemo(() => {
    if (!normalizedQuery) return projects;
    return projects.filter((p) => {
      const name = p?.name || '';
      const texts = (() => {
        const pt = (p?.state?.panelTexts || {}) as Record<string, any>;
        try {
          return Object.values(pt)
            .map((t: any) => (t && typeof t === 'object' ? String(t.content || '') : ''))
            .join(' ');
        } catch (_) {
          return '';
        }
      })();
      const defaults = (() => {
        const imgs = (p?.state?.images || []) as any[];
        return imgs
          .map((img: any) => (img?.libraryKey ? (metaByKey[img.libraryKey]?.defaultCaption || '') : ''))
          .join(' ');
      })();
      const combined = [name, texts, defaults].join(' ');
      return normalizeString(combined).includes(normalizedQuery);
    });
  }, [projects, metaByKey, normalizedQuery]);

  return (
    <Container
      maxWidth="md"
      sx={{
        p: { xs: 1, sm: 2 },
        pb: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', sm: 12 },
      }}
    >
      {/* Header + actions remain above; search moved just above the list inside ProjectPicker */}
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
            Create Meme
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>
      )}
      <ProjectPicker
        projects={filteredProjects}
        onOpen={handleOpen}
        onDelete={handleDelete}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

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
            Create Meme
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
