import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Card, CardContent, CardActions, Typography, Stack, Chip } from '@mui/material';
import { Add, FolderOpen, Delete } from '@mui/icons-material';
import { upsertProject } from '../utils/projects';
import { renderThumbnailFromSnapshot } from '../utils/renderThumbnailFromSnapshot';

const ProjectCard = ({ project, onOpen, onDelete }) => {
  // Thumbnails are now generated inline from project data and stored locally
  const [thumbUrl, setThumbUrl] = useState(project.thumbnail || null);

  useEffect(() => {
    setThumbUrl(project.thumbnail || null);
  }, [project.thumbnail]);

  // If state exists and our stored thumbnail is missing or stale, render it client-side from snapshot
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!project?.state) return;
        // Compute a simple signature; reuse same approach as editor
        const json = JSON.stringify(project.state);
        let hash = 5381; for (let i = 0; i < json.length; i += 1) { hash = (hash * 33 + json.charCodeAt(i)) % 4294967296; }
        const sig = `v1:${Math.floor(hash)}`;

        if (project.thumbnail && project.thumbnailSignature === sig) return;
        const dataUrl = await renderThumbnailFromSnapshot(project.state, { maxDim: 256 });
        if (!cancelled && dataUrl) {
          setThumbUrl(dataUrl);
          // Persist so list thumbnails remain fast next time
          upsertProject(project.id, {
            thumbnail: dataUrl,
            thumbnailKey: null,
            thumbnailSignature: sig,
            thumbnailUpdatedAt: new Date().toISOString(),
          });
        }
      } catch (_) {
        // Best-effort only; ignore
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.state]);

  return (
    <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{project.name || 'Untitled Collage'}</Typography>
            <Typography variant="caption" color="text.secondary">
              Updated {new Date(project.updatedAt).toLocaleString()}
            </Typography>
          </Box>
          {thumbUrl ? (
            <Box component="img" src={thumbUrl} alt="preview" sx={{ width: 64, height: 64, borderRadius: 1, border: '1px solid', borderColor: 'divider', objectFit: 'cover' }} />
          ) : (
            <Chip label="No preview" size="small" />
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button size="small" variant="contained" startIcon={<FolderOpen />} onClick={() => onOpen(project.id)}>Open</Button>
        <Button size="small" color="error" startIcon={<Delete />} onClick={() => onDelete(project.id)}>Delete</Button>
      </CardActions>
    </Card>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default function ProjectPicker({ projects, onCreateNew, onOpen, onDelete }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>Collage Projects</Typography>
        <Typography variant="body2" color="text.secondary">
          Open a previous collage or start a new one. Projects are saved automatically as you edit.
        </Typography>
        <Box>
          <Button variant="contained" startIcon={<Add />} onClick={onCreateNew}>
            New Collage
          </Button>
        </Box>
      </Stack>

      {projects.length === 0 ? (
        <Box sx={{ mt: 4, color: 'text.secondary' }}>No saved projects yet. Click "New Collage" to begin.</Box>
      ) : (
        <Stack spacing={2}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

ProjectPicker.propTypes = {
  projects: PropTypes.array.isRequired,
  onCreateNew: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
