import { Helmet } from 'react-helmet-async';
// @mui
import { Button, Container, Grid, Stack, Typography } from '@mui/material';
// components
import { useState } from 'react';
import Iconify from '../components/iconify';


// ----------------------------------------------------------------------

// ----------------------------------------------------------------------

export default function ImageUploadPage() {
  const [file, setFile] = useState(null);
  console.log(file)
  return (
    <>
      <Helmet>
        <title> Image Upload - memeSRC 2.0 </title>
      </Helmet>

      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            Images
          </Typography>
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />} component="label">
            New Image
            <input hidden accept="image/*" multiple type="file" onChange={(x) => setFile(x.target.files[0])}/>
          </Button>
        </Stack>
        <Grid sx={{
          maxWidth: "200px"
        }}>
          {file && (<img src={URL.createObjectURL(file, file.type)} alt="testing alt" />)}
        </Grid>
      </Container>
    </>
  );
}
