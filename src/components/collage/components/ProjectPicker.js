import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Card, Typography, Stack, CardActionArea, IconButton, Tooltip, Skeleton } from '@mui/material';
import { Masonry } from '@mui/lab';
import { Add, Delete } from '@mui/icons-material';
import { upsertProject } from '../utils/projects';
import { renderThumbnailFromSnapshot } from '../utils/renderThumbnailFromSnapshot';
import PreviewDialog from '../../library/PreviewDialog';

const ProjectCard = ({ project, onOpen, onDelete, onPreview }) => {
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
        const sig = `v2:${Math.floor(hash)}`;

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
    <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderColor: 'divider', overflow: 'hidden', borderRadius: 2 }}>
      <Box sx={{ position: 'relative' }}>
        <CardActionArea onClick={() => (onPreview ? onPreview() : onOpen(project.id))}>
          {thumbUrl ? (
            <Box
              component="img"
              src={thumbUrl}
              alt="preview"
              loading="lazy"
              sx={{ display: 'block', width: '100%', height: 'auto' }}
            />
          ) : (
            <Skeleton variant="rectangular" sx={{ width: '100%', height: 200 }} />
          )}
          {/* Overlay with title and updated time removed for cleaner thumbnail */}
        </CardActionArea>
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <Tooltip title="Delete">
            <IconButton aria-label="delete project" color="error" onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
};

ProjectCard.propTypes = {
  project: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onPreview: PropTypes.func,
};

export default function ProjectPicker({ projects, onCreateNew, onOpen, onDelete }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [imageCache, setImageCache] = useState({}); // id -> dataUrl

  const getProjectAt = (index) => {
    if (!Array.isArray(projects) || index < 0 || index >= projects.length) return null;
    return projects[index];
  };

  const ensurePreviewForIndex = async (index) => {
    const proj = getProjectAt(index);
    if (!proj) return;
    if (imageCache[proj.id]) return;
    try {
      if (proj.state) {
        const dataUrl = await renderThumbnailFromSnapshot(proj.state, { maxDim: 1024 });
        if (dataUrl) setImageCache((c) => ({ ...c, [proj.id]: dataUrl }));
      } else if (proj.thumbnail) {
        setImageCache((c) => ({ ...c, [proj.id]: proj.thumbnail }));
      }
    } catch (_) {
      if (proj.thumbnail) setImageCache((c) => ({ ...c, [proj.id]: proj.thumbnail }));
    }
  };

  const handleOpenPreviewAt = async (index) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
    await ensurePreviewForIndex(index);
    // Prefetch neighbors
    ensurePreviewForIndex(index + 1);
    ensurePreviewForIndex(index - 1);
  };

  const handlePrev = async () => {
    const next = Math.max(0, previewIndex - 1);
    if (next !== previewIndex) {
      setPreviewIndex(next);
      await ensurePreviewForIndex(next);
      ensurePreviewForIndex(next - 1);
    }
  };

  const handleNext = async () => {
    const next = Math.min((projects?.length || 1) - 1, previewIndex + 1);
    if (next !== previewIndex) {
      setPreviewIndex(next);
      await ensurePreviewForIndex(next);
      ensurePreviewForIndex(next + 1);
    }
  };

  const activeProject = getProjectAt(previewIndex);
  const activeImageUrl = activeProject ? (imageCache[activeProject.id] || activeProject.thumbnail || null) : null;

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>Collage Projects</Typography>
            <Typography variant="body2" color="text.secondary">
              Open a previous collage or start a new one. Projects are saved automatically as you edit.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={onCreateNew}>
            New Collage
          </Button>
        </Stack>
      </Stack>

      {projects.length === 0 ? (
        <Box sx={{ mt: 4, color: 'text.secondary' }}>No saved projects yet. Click "New Collage" to begin.</Box>
      ) : (
        <Masonry columns={{ xs: 2, sm: 2, md: 3, lg: 4 }} spacing={1.5} sx={{ m: 0 }}>
          {projects.map((p, idx) => (
            <div key={p.id}>
              <ProjectCard project={p} onOpen={onOpen} onDelete={onDelete} onPreview={() => handleOpenPreviewAt(idx)} />
            </div>
          ))}
        </Masonry>
      )}

      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        imageUrl={activeImageUrl}
        titleId="collage-preview-title"
        title="Collage Preview"
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex < (projects?.length || 0) - 1}
        ctaLabel="Edit collage"
        onCta={() => { if (activeProject) { onOpen(activeProject.id); setPreviewOpen(false); } }}
        showInfo={false}
      />
    </Box>
  );
}

ProjectPicker.propTypes = {
  projects: PropTypes.array.isRequired,
  onCreateNew: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
