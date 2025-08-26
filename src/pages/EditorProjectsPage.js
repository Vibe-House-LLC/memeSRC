import { useEffect, useState } from 'react';
import {
  Container,
  ImageList,
  ImageListItem,
  Button,
  Box,
  Stack,
  Typography,
  useMediaQuery,
  Chip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API, Storage, graphqlOperation } from 'aws-amplify';
import BasePage from './BasePage';
import { listEditorProjects } from '../graphql/queries';

export default function EditorProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const imageCols = isMdUp ? 4 : isXs ? 2 : 3; // mobile-first: 2 cols on phones

  const formatAgo = (iso) => {
    if (!iso) return '';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.max(0, now - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    if (w < 4) return `${w}w ago`;
    const mo = Math.floor(d / 30);
    return `${mo}mo ago`;
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await API.graphql(graphqlOperation(listEditorProjects));
        const projectsList = projectsData.data.listEditorProjects.items;
        
        const mappedProjectsPromises = projectsList.map(async project => {
          let imageUrl;
          const key = `projects/${project.id}-preview.jpg`;
  
          try {
            imageUrl = await Storage.get(key, { level: 'protected' });
          } catch (error) {
            console.error(`Error fetching image for project ${project.id}:`, error);
            imageUrl = 'https://picsum.photos/id/237/200/267'; // Fallback image
          }
  
          return {
            id: project.id,
            title: project.title,
            imageUrl,
            createdDate: project.createdAt,
            updatedDate: project.updatedAt || project.createdAt,
          };
        });
  
        const mappedProjects = await Promise.all(mappedProjectsPromises);
        const sortedProjects = mappedProjects.sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));
        
        setProjects(sortedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
  
    fetchProjects();
  }, []);
  

  return (
    <BasePage
      pageTitle="Meme Projects"
      breadcrumbLinks={[
        { path: '/', name: 'Home' },
        { path: '/editor/new', name: 'Editor' },
        { path: '/editor/projects', name: 'Meme Projects' },
      ]}
    >
      <Container sx={{ p: 0 }}>
        <Stack spacing={1.25} sx={{ mb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            aria-label="Create a new meme"
            onClick={() => navigate('/editor/new')}
            startIcon={<Add />}
            sx={(t) => ({
              py: 1.5,
              borderRadius: 999,
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: 0.2,
              boxShadow: t.customShadows?.primary,
              backgroundImage: `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
              color: t.palette.primary.contrastText,
              '&:hover': {
                backgroundImage: `linear-gradient(90deg, ${t.palette.primary.dark}, ${t.palette.primary.darker || t.palette.primary.dark})`,
                boxShadow: `0 8px 16px 0 ${alpha(t.palette.primary.main, 0.24)}`,
                transform: 'translateY(-1px)',
              },
            })}
          >
            Create Meme
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
            {projects.length > 0
              ? `${projects.length} saved ${projects.length === 1 ? 'meme' : 'memes'}`
              : 'Create your first meme to get started'}
          </Typography>
        </Stack>

        {/* Recent scroller */}
        {projects.length > 0 && (
          <Box sx={{ mb: 2 }} aria-label="Recents">
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Recents
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                px: 0.5,
                py: 0.5,
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                justifyContent: 'center',
              }}
              role="list"
            >
              {projects.slice(0, 15).map((project) => (
                <Box key={`recent-${project.id}`} role="listitem" sx={{ flex: '0 0 auto', width: { xs: 160, sm: 140, md: 128 }, textAlign: 'center' }}>
                  <Box
                    onClick={() => navigate(`/editor/project/${project.id}`)}
                    sx={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: '#000',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      '&:active img': { transform: 'scale(0.985)' },
                    }}
                  >
                    <Box component="img" src={project.imageUrl} alt={project.title || 'meme'} loading="lazy"
                         sx={{ display: 'block', width: 'calc(100% - 8px)', height: 'calc(100% - 8px)', objectFit: 'contain' }} />
                  </Box>
                  <Chip label={formatAgo(project.updatedDate)} size="small" variant="outlined" sx={{ mt: 0.5, height: 22, fontSize: '0.7rem' }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {projects.length === 0 ? (
          <Box
            sx={{
              mt: 1,
              p: 2.5,
              borderRadius: 2,
              border: `1px dashed ${alpha(theme.palette.text.secondary, 0.2)}`,
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2">
              No memes yet. Tap “Create Meme” to create one.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, px: 0.5 }}>
              All Memes
            </Typography>
            <ImageList variant="masonry" cols={imageCols} gap={8}>
            {projects.map((project) => (
              <ImageListItem
                key={project.id}
                onClick={() => navigate(`/editor/project/${project.id}`)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 0,
                  overflow: 'hidden',
                  '& img': {
                    transition: 'transform 120ms ease',
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  },
                  '&:active img': {
                    transform: 'scale(0.98)',
                  },
                }}
              >
                <img src={project.imageUrl} alt={project.title} loading="lazy" />
              </ImageListItem>
            ))}
            </ImageList>
          </>
        )}
      </Container>
    </BasePage>
  );

}
