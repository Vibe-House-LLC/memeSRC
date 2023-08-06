import { useEffect, useState } from 'react';
import { Container, Typography, Grid, Card, CardActionArea, CardContent, Box } from '@mui/material';
import BasePage from './BasePage';

export default function EditorProjectsPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    setProjects([
      { id: 1, title: "Project 1", imageUrl: "https://picsum.photos/id/237/200/267", createdDate: "2023-01-01" },
      { id: 2, title: "Project 2", imageUrl: "https://picsum.photos/id/238/200/267", createdDate: "2023-02-02" },
      { id: 3, title: "Project 3", imageUrl: "https://picsum.photos/id/239/200/267", createdDate: "2023-03-03" },
      { id: 4, title: "Project 4", imageUrl: "https://picsum.photos/id/240/200/267", createdDate: "2023-04-04" },
      { id: 5, title: "Project 5", imageUrl: "https://picsum.photos/id/241/200/267", createdDate: "2023-05-05" },
      { id: 6, title: "Project 6", imageUrl: "https://picsum.photos/id/242/200/267", createdDate: "2023-06-06" },
      // add more projects as needed
    ]);
  }, []);

  return (
    <BasePage
      pageTitle="My Projects"
      breadcrumbLinks={[
        { path: "/", name: "Home" },
        { path: "/editor/new", name: "Editor" },
        { path: "/editor/new", name: "Projects" }
      ]}
    >
      <Container sx={{ py: 5 }}>
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item key={project.id} xs={12} sm={6} md={4}>
              <Card>
                <CardActionArea>
                  <Box sx={{ pt: '75%' ,position: 'relative'}}>
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
                        objectPosition: 'center' 
                      }} 
                    />
                  </Box>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {project.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created on: {new Date(project.createdDate).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </BasePage>
  );
}
