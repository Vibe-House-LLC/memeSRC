import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { AppBar, Toolbar, IconButton, Button, Typography, Container, Card, CardContent, CardMedia, Grid, Chip, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { API } from 'aws-amplify';
import HomeIcon from '@mui/icons-material/Home';
import { listSeries } from '../graphql/queries';
import BasePage from './BasePage';

const StyledCard = styled(Card)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
});

export default function SeriesPage({ seriesData }) { // Destructure seriesData from props
  // No need to fetch seriesData again, so we can remove the related useState and useEffect

  return (
    <BasePage
      pageTitle="Series Details"
      breadcrumbLinks={[
        { path: "/", name: "Home" },
        { path: `/${seriesData.slug}`, name: seriesData.name }
      ]}
    >
      <Helmet>
        <title> Series Details | memeSRC 2.0 </title>
      </Helmet>

      <Container maxWidth="xl">
        <Grid container spacing={2} direction="row" alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardMedia
                component="img"
                alt={seriesData.name}
                image={seriesData.image}
                sx={{ maxHeight: '500px', objectFit: 'contain' }}
              />
            </StyledCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <CardContent>
              <Typography variant="h2">{seriesData.name} ({seriesData.year})</Typography>
              <Typography variant="body1">{seriesData.description}</Typography>
              <Typography variant="h4">Seasons:</Typography>
            </CardContent>
          </Grid>
        </Grid>
      </Container>
    </BasePage>
  );
}