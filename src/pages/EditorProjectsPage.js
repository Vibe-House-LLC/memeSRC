import { useEffect, useState } from 'react';
import { Container, Typography, Grid, Card, CardActionArea, CardContent, Box } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';
import BasePage from './BasePage';
import { listEditorProjects } from '../graphql/queries';

export default function EditorProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await API.graphql(graphqlOperation(listEditorProjects));
        const projectsList = projectsData.data.listEditorProjects.items;
        // Map the fetched projects to the expected format
        const mappedProjects = projectsList.map(project => ({
          id: project.id,
          title: project.title,
          // Here you can use a solid color or one of your placeholder images
          imageUrl: 'https://picsum.photos/id/237/200/267', 
          createdDate: project.createdAt // Assuming your model auto-generates createdAt
        }));
        setProjects(mappedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, []);

  // Project Card sub-component
  function ProjectCard({ project, isAddNew }) {
    const onClick = isAddNew 
    ? () => navigate('/editor/new')
    : () => navigate(`/editor/project/${project.id}`);

    return (
      <Card>
        <CardActionArea onClick={onClick}>
          <Box
            sx={{
              height: '300px',
              position: 'relative',
              backgroundColor: isAddNew ? 'gray' : undefined,
              display: isAddNew ? 'flex' : undefined,
              justifyContent: isAddNew ? 'center' : undefined,
              alignItems: isAddNew ? 'center' : undefined,
            }}
          >
            {isAddNew ? (
              <AddCircleOutlineIcon style={{ fontSize: '5rem' }} />
            ) : (
              <img
                src={project.imageUrl}
                alt={project.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            )}
          </Box>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              {isAddNew ? 'Create New Project' : project.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isAddNew
                ? 'Start a new editor project'
                : `Created on: ${new Date(project.createdDate).toLocaleDateString()}`}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  }

  return (
    <BasePage
      pageTitle="My Projects"
      breadcrumbLinks={[
        { path: '/', name: 'Home' },
        { path: '/editor/new', name: 'Editor' },
        { path: '/editor/new', name: 'Projects' },
      ]}
    >
      <Container sx={{ py: 5 }}>
        <Grid container spacing={3}>
          <Grid item key="addNew" xs={12} sm={6} md={4}>
            <ProjectCard isAddNew />
          </Grid>

          {projects.map((project) => (
            <Grid item key={project.id} xs={12} sm={6} md={4}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </BasePage>
  );
}
