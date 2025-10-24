import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Typography, Stack, CardActionArea, IconButton, Tooltip, Skeleton, TextField, InputAdornment } from '@mui/material';
import type { BoxProps } from '@mui/material';
import { Masonry } from '@mui/lab';
import { Delete, Search, Clear, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { renderThumbnailFromSnapshot } from '../utils/renderThumbnailFromSnapshot';
import type { CollageProject } from '../../../types/collage';
import { alpha } from '@mui/material/styles';
import { resolveThumbnailUrl } from '../utils/templates';
// no responsive hooks needed here

type ProjectCardProps = {
  project: CollageProject;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete }) => {
  // Thumbnails are generated inline from project data and stored locally
  const [thumbUrl, setThumbUrl] = useState<string | null>(project.thumbnail || null);
  const [thumbLoading, setThumbLoading] = useState<boolean>(false);

  useEffect(() => {
    setThumbUrl(project.thumbnail || null);
  }, [project.thumbnail]);

  // Resolve thumbnail URL from remote storage (fallback to inline snapshot render if missing)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!project) return;
        if (project.thumbnailKey) {
          setThumbLoading(true);
          const url = await resolveThumbnailUrl(project);
          if (!cancelled) setThumbUrl(url || project.thumbnail || null);
          if (!cancelled) setThumbLoading(false);
          if (url || project.thumbnail) return;
        }
        if (project.thumbnail) {
          if (!cancelled) setThumbUrl(project.thumbnail);
          return;
        }
        if (project?.state) {
          const dataUrl = await renderThumbnailFromSnapshot(project.state, { maxDim: 256 });
          if (!cancelled) setThumbUrl(dataUrl || null);
        }
      } catch (_) {
        if (!cancelled) setThumbLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.state, project.thumbnailKey, project.thumbnailUpdatedAt, project.thumbnailSignature]);

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
            <Skeleton variant="rectangular" sx={{ width: '100%', height: 200, opacity: thumbLoading ? 1 : 0.4 }} />
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
          <RecentScroller recent={recent} onOpen={onOpen} />
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

// Horizontal scroller with simple left/right indicators
const RecentScroller: React.FC<{ recent: CollageProject[]; onOpen: (id: string) => void }> = ({ recent, onOpen }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  // simple left/right controls; no breakpoint-based logic

  // Recalculate pages on mount, resize, or content changes
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const calc = () => {
      const left = el.scrollLeft || 0;
      const cw = el.clientWidth || 0;
      const sw = el.scrollWidth || 0;
      setCanLeft(left > 0);
      setCanRight(left + cw < sw - 1);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    window.addEventListener('resize', calc);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calc);
    };
  }, [recent.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const left = el.scrollLeft || 0;
        const cw = el.clientWidth || 0;
        const sw = el.scrollWidth || 0;
        setCanLeft(left > 0);
        setCanRight(left + cw < sw - 1);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      cancelAnimationFrame(raf);
    };
  }, []);

  const scrollByPage = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const cw = el.clientWidth || 0;
    const delta = dir === 'left' ? -cw : cw;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const fadePx = 40;
  const edgeMaskSx = React.useMemo(() => {
    if (canLeft && canRight) {
      const g = `linear-gradient(to right, transparent 0, black ${fadePx}px, black calc(100% - ${fadePx}px), transparent 100%)`;
      return { WebkitMaskImage: g, maskImage: g } as const;
    }
    if (canLeft) {
      const g = `linear-gradient(to right, transparent 0, black ${fadePx}px, black 100%)`;
      return { WebkitMaskImage: g, maskImage: g } as const;
    }
    if (canRight) {
      const g = `linear-gradient(to right, black 0, black calc(100% - ${fadePx}px), transparent 100%)`;
      return { WebkitMaskImage: g, maskImage: g } as const;
    }
    return {} as const;
  }, [canLeft, canRight]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={scrollerRef}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          px: 0.5,
          py: 0.5,
          scrollSnapType: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          justifyContent: 'flex-start',
          ...edgeMaskSx,
        }}
        role="list"
      >
        {recent.map((p) => (
          <RecentThumb key={`recent-${p.id}`} project={p} onOpen={onOpen} />
        ))}
      </Box>
      {canLeft && (
        <IconButton
          size="small"
          aria-label="Scroll left"
          onClick={() => scrollByPage('left')}
          sx={(theme) => ({
            position: 'absolute',
            top: '50%',
            left: -6,
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: alpha(theme.palette.text.primary, 0.25),
            boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
            zIndex: 2,
            '&:hover': { bgcolor: 'background.paper' },
          })}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
      )}
      {canRight && (
        <IconButton
          size="small"
          aria-label="Scroll right"
          onClick={() => scrollByPage('right')}
          sx={(theme) => ({
            position: 'absolute',
            top: '50%',
            right: -6,
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: alpha(theme.palette.text.primary, 0.25),
            boxShadow: '0 6px 16px rgba(0,0,0,0.28)',
            zIndex: 2,
            '&:hover': { bgcolor: 'background.paper' },
          })}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

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
        if (!project) return;
        if (project.thumbnailKey) {
          const url = await resolveThumbnailUrl(project);
          if (!cancelled) setThumbUrl(url || project.thumbnail || null);
          if (url || project.thumbnail) return;
        }
        if (project.thumbnail) {
          if (!cancelled) setThumbUrl(project.thumbnail);
          return;
        }
        if (project.state) {
          const dataUrl = await renderThumbnailFromSnapshot(project.state, { maxDim: 256 });
          if (!cancelled) setThumbUrl(dataUrl || null);
        }
      } catch (_) {
        // ignore best-effort
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.state, project.thumbnailKey, project.thumbnailUpdatedAt, project.thumbnailSignature]);

  return (
    <Box role="listitem" sx={{ flex: '0 0 auto', width: { xs: 96, sm: 96, md: 88 }, textAlign: 'center' }}>
      <Box
        onClick={() => onOpen(project.id)}
        sx={{
          width: '100%',
          aspectRatio: '4 / 5',
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
    </Box>
  );
};
