import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Stack, CardActionArea, IconButton, Tooltip, Skeleton, TextField, InputAdornment } from '@mui/material';
import type { BoxProps } from '@mui/material';
import { Masonry } from '@mui/lab';
import { Delete, Search, Clear } from '@mui/icons-material';
import { upsertProject } from '../utils/projects';
import { renderThumbnailFromSnapshot } from '../utils/renderThumbnailFromSnapshot';
import type { CollageProject } from '../../../types/collage';

type ProjectCardProps = {
  project: CollageProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete }) => {
  // Thumbnails are generated inline from project data and stored locally
  const [thumbUrl, setThumbUrl] = useState<string | null>(project.thumbnail || null);

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
    <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderColor: 'divider', overflow: 'hidden', borderRadius: 0 }}>
      <Box sx={{ position: 'relative' }}>
        <CardActionArea onClick={() => onOpen(project.id)}>
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

export type ProjectPickerProps = BoxProps & {
  projects: CollageProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  // Optional search controls rendered just above the list
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
};

export default function ProjectPicker(props: ProjectPickerProps) {
  const { projects, onOpen, onDelete, searchQuery, onSearchChange, ...rest } = props; // keep onCreateNew in props type for API consistency
  return (
    <Box sx={{ width: '100%' }} {...rest}>
      <Stack spacing={1.25} sx={{ mb: 1.5 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            color: '#fff',
            mb: 0.5,
            fontSize: { xs: '2.0rem', sm: '2.3rem' },
            textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
          }}
        >
          Your Memes
        </Typography>
      </Stack>

      {/* Search input just above the list */}
      {typeof searchQuery === 'string' && typeof onSearchChange === 'function' && (
        <Box sx={{ mb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your memes..."
            aria-label="Search your memes"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Clear search" onClick={() => onSearchChange('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ '& .MuiInputBase-root': { borderRadius: 1.5 } }}
          />
        </Box>
      )}

      {projects.length === 0 ? (
        <Box sx={{ mt: 4, color: 'text.secondary' }}>No saved memes yet. Click "Create Meme" to begin.</Box>
      ) : (
        <Masonry columns={{ xs: 2, sm: 2, md: 3, lg: 4 }} spacing={1.5} sx={{ m: 0 }}>
          {projects.map((p) => (
            <div key={p.id}>
              <ProjectCard project={p} onOpen={onOpen} onDelete={onDelete} />
            </div>
          ))}
        </Masonry>
      )}
    </Box>
  );
}
