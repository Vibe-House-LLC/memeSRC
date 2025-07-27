import React from 'react';

import { Helmet } from 'react-helmet-async';
import TvdbSearch from '../components/TvdbSearch/TvdbSearch';

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

          {/* <AddSeries /> */}
          <TvdbSearch onSelect={(result) => alert(result.name)} />
        </Container>
    </>
  );
}
