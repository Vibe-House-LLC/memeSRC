import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import ProjectPicker from './components/ProjectPicker';
import type { CollageProject } from '../../types/collage';
import { loadProjects } from './utils/templates';

type Mode = 'new' | 'existing';

export type AddToCollageChooserProps = {
  open: boolean;
  onClose: () => void;
  onSelectNew: () => void;
  onSelectExisting: (project: CollageProject) => void;
  loading?: boolean;
  preview?: {
    projectId: string;
    name?: string | null;
    thumbnail?: string | null;
  } | null;
  onEditPreview?: () => void;
  onClearPreview?: () => void;
};

export default function AddToCollageChooser({
  open,
  onClose,
  onSelectNew,
  onSelectExisting,
  loading = false,
  preview = null,
  onEditPreview,
  onClearPreview,
}: AddToCollageChooserProps) {
  const [mode, setMode] = useState<Mode>('new');
  const [projects, setProjects] = useState<CollageProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const effectiveLoading = loading || fetching;

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setFetching(true);
      try {
        const list = await loadProjects({ forceRefresh: true });
        setProjects(list || []);
      } catch (_) {
        setProjects([]);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [open]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const handleConfirm = useCallback(() => {
    if (mode === 'new') {
      onSelectNew();
      return;
    }
    if (selectedProject) {
      onSelectExisting(selectedProject);
    }
  }, [mode, onSelectExisting, onSelectNew, selectedProject]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{preview ? 'Collage updated' : 'Add to collage'}</DialogTitle>
      <DialogContent>
        {preview ? (
          <Stack spacing={2}>
            <DialogContentText>
              Your image was added. You can jump into the collage to keep editing.
            </DialogContentText>
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              {preview.thumbnail ? (
                <Box
                  component="img"
                  src={preview.thumbnail}
                  alt={preview.name || 'Collage preview'}
                  sx={{ width: '100%', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    height: 200,
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
            </Box>
          </Stack>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Add this image to a new collage or an existing one.
            </DialogContentText>
            <RadioGroup
              row
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              sx={{ mb: 2 }}
            >
              <FormControlLabel value="new" control={<Radio />} label="Add to new collage" />
              <FormControlLabel value="existing" control={<Radio />} label="Add to existing collage" />
            </RadioGroup>

            {mode === 'existing' && (
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Your collages
                </Typography>
                <ProjectPicker
                  projects={projects}
                  isLoading={effectiveLoading}
                  compact
                  hasError={false}
                  selectedProjectId={selectedProjectId}
                  onOpen={(id) => setSelectedProjectId(id)}
                  onDelete={() => {}}
                />
                {!effectiveLoading && projects.length === 0 && (
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    No collages yet. Choose “Add to new collage” to create one.
                  </Typography>
                )}
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={preview ? onClearPreview || onClose : onClose} disabled={effectiveLoading}>
          {preview ? 'Close' : 'Cancel'}
        </Button>
        {preview ? (
          <Button variant="contained" onClick={onEditPreview} disabled={effectiveLoading}>
            Edit collage
          </Button>
        ) : (
          <LoadingButton
            variant="contained"
            onClick={handleConfirm}
            loading={effectiveLoading}
            disabled={mode === 'existing' && !selectedProject}
          >
            Add
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
