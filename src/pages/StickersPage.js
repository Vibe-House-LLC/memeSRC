import React from 'react';
import { Container, Grid, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import StickerCreator from '../components/stickers/StickerCreator';

export default function StickersPage() {
  return (
    <Container maxWidth='md' sx={{ py: 3 }}>
      <Helmet>
        <title>Stickers • memeSRC</title>
      </Helmet>
      <Typography variant='h4' gutterBottom>Create Stickers</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <StickerCreator onSelect={(url) => console.log('Selected sticker:', url)} />
        </Grid>
      </Grid>
    </Container>
  );
}


