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
            createdDate: project.createdAt
          };
        });
  
        const mappedProjects = await Promise.all(mappedProjectsPromises);
        const sortedProjects = mappedProjects.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        
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
            New Meme
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
            {projects.length > 0
              ? `${projects.length} saved ${projects.length === 1 ? 'meme' : 'memes'}`
              : 'Create your first meme to get started'}
          </Typography>
        </Stack>

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
              No memes yet. Tap “New Meme” to create one.
            </Typography>
          </Box>
        ) : (
          <ImageList variant="masonry" cols={imageCols} gap={8}>
            {projects.map((project) => (
              <ImageListItem
                key={project.id}
                onClick={() => navigate(`/editor/project/${project.id}`)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
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
        )}
      </Container>
    </BasePage>
  );

}
