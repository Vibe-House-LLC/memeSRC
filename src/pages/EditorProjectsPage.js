import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Breadcrumbs, Link } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import BasePage from './BasePage';

export default function EditorProjectsPage() {
  // useState declarations here

  useEffect(() => {
    // Any initial data loading operations can go here.

    // API calls here
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
      {/* Add your page-specific components or elements here */}
    </BasePage>
  );
}
