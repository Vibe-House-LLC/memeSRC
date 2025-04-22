import { generateClient , graphqlOperation } from 'aws-amplify/api';
import { useEffect, useState } from 'react';
import { Container, Typography, ImageList, ImageListItem, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Storage } from 'aws-amplify/storage';
import BasePage from './BasePage';
import { listEditorProjects } from '../graphql/queries';

const client = generateClient();

export default function EditorProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await client.graphql({
          query: listEditorProjects,
          authMode: 'awsIam'
        });
        const projectsList = projectsData.data.listEditorProjects.items;
        
        const mappedProjectsPromises = projectsList.map(async project => {
          let imageUrl;
          const key = `projects/${project.id}-preview.jpg`;
  
          try {
            imageUrl = await getUrl({
              key,
              options: { level: 'protected' }
            });
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
      pageTitle="My Projects"
      breadcrumbLinks={[
        { path: '/', name: 'Home' },
        { path: '/editor/new', name: 'Editor' },
        { path: '/editor/new', name: 'Projects' },
      ]}
    >
      <Container sx={{ padding: 0 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          size="large"
          onClick={() => navigate('/editor/new')}
          sx={{ marginBottom: 2, backgroundColor: 'limegreen' }}
          startIcon={<Add />}
        >
          New Project
        </Button>
        <ImageList variant="masonry" cols={3} gap={8}>
          {projects.map((project) => (
            <ImageListItem key={project.id} onClick={() => navigate(`/editor/project/${project.id}`)}>
              <img
                src={project.imageUrl}
                alt={project.title}
                loading="lazy"
              />
            </ImageListItem>
          ))}
        </ImageList>
      </Container>
    </BasePage>
  );
  
}
