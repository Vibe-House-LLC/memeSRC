import React, { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import MagicEditor from '../components/magic-editor/MagicEditor';

export default function MagicPage() {
  const [image, setImage] = useState<string | null>(null);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Magic Editor (Demo)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pick a photo, type a prompt, and apply magic. This demo overlays an “edited” label after a short delay to simulate processing.
        </Typography>
      </Box>
      <MagicEditor imageSrc={image} onImageChange={setImage} />
    </Container>
  );
}

