import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, Card, Container, Typography } from '@mui/material';
import styled from '@emotion/styled';
import { Stack } from '@mui/system';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { Helmet } from 'react-helmet-async';
import AddSeries from '../sections/@dashboard/series/AddSeries';
// import FullScreenSearch from '../sections/search/FullScreenSearch';
// import TopBannerSearch from '../sections/search/TopBannerSearch';

// Prop types
// EpisodePage.propTypes = {
//   setSeriesTitle: PropTypes.func
// };

export default function AddSeriesPage() {

  return (

    <>
      <Helmet>
        <title> Dashboard: Add Series | memeSRC </title>
      </Helmet>
        <Container>
          <Typography variant="h4" gutterBottom marginBottom={{xs: 5, md: 8}}>
            Add New Series
          </Typography>

          <AddSeries />
        </Container>
    </>
  );
}
