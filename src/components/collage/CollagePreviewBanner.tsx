import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export type CollagePreviewBannerProps = {
  name?: string | null;
  projectId: string;
  thumbnail?: string | null;
  onEdit: () => void;
  onDismiss?: () => void;
};

export default function CollagePreviewBanner({
  name,
  projectId,
  thumbnail,
  onEdit,
  onDismiss,
}: CollagePreviewBannerProps) {
  return (
    <Card
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 320,
        maxWidth: '90vw',
        zIndex: 1300,
      }}
    >
      {thumbnail ? (
        <CardMedia component="img" height="180" image={thumbnail} alt={name || 'Collage preview'} />
      ) : (
        <Box
          sx={{
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.900',
            color: '#fff',
          }}
        >
          <Typography variant="subtitle1">Collage updated</Typography>
        </Box>
      )}
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {name || 'Untitled collage'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Collage updated • {projectId.slice(0, 8)}
            </Typography>
          </Box>
          {onDismiss && (
            <IconButton onClick={onDismiss} size="small" aria-label="Dismiss collage preview">
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
        <Button fullWidth variant="contained" onClick={onEdit}>
          Edit collage
        </Button>
      </CardActions>
    </Card>
  );
}
