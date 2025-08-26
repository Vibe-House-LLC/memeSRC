import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, Typography, Stack, CardActionArea, IconButton, Tooltip, Skeleton, TextField, InputAdornment, Chip } from '@mui/material';
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
  const recent = useMemo(() => {
    try {
      return [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 15);
    } catch (_) {
      return projects.slice(0, 15);
    }
  }, [projects]);

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

      {/* Recent scroller */}
      {recent.length > 0 && (
        <Box sx={{ mb: 1.5 }} aria-label="Recent Edits">
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Recent Edits
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              px: 0.5,
              py: 0.5,
              scrollSnapType: { xs: 'x proximity', sm: 'none' },
              '&::-webkit-scrollbar': { display: 'none' },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              justifyContent: 'flex-start',
            }}
            role="list"
          >
            {recent.map((p) => (
              <RecentThumb key={`recent-${p.id}`} project={p} onOpen={onOpen} />
            ))}
          </Box>
        </Box>
      )}


      {projects.length === 0 ? (
        <Box sx={{ mt: 4, color: 'text.secondary' }}>No saved memes yet. Click "Create Meme" to begin.</Box>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.75, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            All Memes
          </Typography>
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
          <Masonry columns={{ xs: 2, sm: 2, md: 3, lg: 4 }} spacing={1.5} sx={{ m: 0 }}>
            {projects.map((p) => (
              <div key={p.id}>
                <ProjectCard project={p} onOpen={onOpen} onDelete={onDelete} />
              </div>
            ))}
          </Masonry>
        </>
      )}
    </Box>
  );
}

// Compact thumbnail used in the horizontal recent scroller
const RecentThumb: React.FC<{ project: CollageProject; onOpen: (id: string) => void }> = ({ project, onOpen }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(project.thumbnail || null);

  useEffect(() => {
    setThumbUrl(project.thumbnail || null);
  }, [project.thumbnail]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!project?.state) return;
        const json = JSON.stringify(project.state);
        let hash = 5381; for (let i = 0; i < json.length; i += 1) { hash = (hash * 33 + json.charCodeAt(i)) % 4294967296; }
        const sig = `v2:${Math.floor(hash)}`;
        if (project.thumbnail && project.thumbnailSignature === sig) return;
        const dataUrl = await renderThumbnailFromSnapshot(project.state, { maxDim: 256 });
        if (!cancelled && dataUrl) {
          setThumbUrl(dataUrl);
          upsertProject(project.id, {
            thumbnail: dataUrl,
            thumbnailKey: null,
            thumbnailSignature: sig,
            thumbnailUpdatedAt: new Date().toISOString(),
          });
        }
      } catch (_) {
        // ignore best-effort
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.state]);

  const formatAgo = (iso?: string | null) => {
    if (!iso) return '';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.max(0, now - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    if (w < 4) return `${w}w ago`;
    const mo = Math.floor(d / 30);
    return `${mo}mo ago`;
  };

  return (
    <Box role="listitem" sx={{ flex: '0 0 auto', width: { xs: 128, sm: 112, md: 100 }, scrollSnapAlign: 'start', textAlign: 'center' }}>
      <Box
        onClick={() => onOpen(project.id)}
        sx={{
          width: '100%',
          aspectRatio: '1 / 1',
          border: 1,
          borderColor: 'divider',
          bgcolor: '#000',
          overflow: 'hidden',
          cursor: 'pointer',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:active img': { transform: 'scale(0.985)' },
        }}
      >
        {thumbUrl ? (
          <Box component="img" src={thumbUrl} alt={project.name || 'meme'} loading="lazy" sx={{ display: 'block', width: 'calc(100% - 8px)', height: 'calc(100% - 8px)', objectFit: 'contain' }} />
        ) : (
          <Skeleton variant="rectangular" sx={{ width: '100%', height: '100%' }} />
        )}
      </Box>
      <Chip
        label={formatAgo(project.updatedAt)}
        size="small"
        variant="outlined"
        sx={{ mt: 0.5, height: 22, fontSize: '0.7rem' }}
      />
    </Box>
  );
};
