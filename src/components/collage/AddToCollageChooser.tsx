import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
};

export default function AddToCollageChooser({
  open,
  onClose,
  onSelectNew,
  onSelectExisting,
  loading = false,
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
      <DialogTitle>Add to collage</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={effectiveLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={effectiveLoading || (mode === 'existing' && !selectedProject)}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
