import { useEffect, useState } from 'react';
import { Container, Typography, Grid, Card, CardActionArea, CardContent, Box } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useNavigate } from 'react-router-dom';
import BasePage from './BasePage';

export default function EditorProjectsPage() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setProjects([
      { id: 1, title: 'Project 1', imageUrl: 'https://picsum.photos/id/237/200/267', createdDate: '2023-01-01' },
      { id: 2, title: 'Project 2', imageUrl: 'https://picsum.photos/id/238/200/267', createdDate: '2023-02-02' },
      { id: 3, title: 'Project 3', imageUrl: 'https://picsum.photos/id/239/200/267', createdDate: '2023-03-03' },
      { id: 4, title: 'Project 4', imageUrl: 'https://picsum.photos/id/240/200/267', createdDate: '2023-04-04' },
      { id: 5, title: 'Project 5', imageUrl: 'https://picsum.photos/id/241/200/267', createdDate: '2023-05-05' },
      { id: 6, title: 'Project 6', imageUrl: 'https://picsum.photos/id/242/200/267', createdDate: '2023-06-06' },
    ]);
  }, []);

  // Project Card sub-component
  function ProjectCard({ project, isAddNew }) {
    const onClick = isAddNew ? () => navigate('/editor/new') : undefined;

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
