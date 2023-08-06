import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Breadcrumbs, Link } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export default function BasePage({ pageTitle, breadcrumbLinks = [], children }) {
  // useState declarations here

  useEffect(() => {
    // Any initial data loading operations can go here.

    // API calls here
  }, []);

  return (
    <>
      <Helmet>
        <title>{pageTitle} - Editor - memeSRC</title>
      </Helmet>

      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
          {pageTitle}
        </Typography>

        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 4 }}>
          {breadcrumbLinks.map((link, index) => (
            index !== breadcrumbLinks.length - 1 ?
              <Link color="inherit" href={link.path} key={index}>
                {link.name}
              </Link>
              :
              <Typography color="text.primary" key={index}><b>{link.name}</b></Typography>
          ))}
        </Breadcrumbs>

        {children}
      </Container>
    </>
  );
}
