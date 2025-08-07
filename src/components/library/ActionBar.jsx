import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Slide } from '@mui/material';

export default function ActionBar({ open, primaryLabel, onPrimary, disabled, count }) {
  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
        bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider',
        p: 2, boxShadow: '0 -8px 24px rgba(0,0,0,0.12)'
      }}>
        <Box sx={{ maxWidth: 960, mx: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={onPrimary}
            disabled={disabled}
            fullWidth
          >
            {primaryLabel}{typeof count === 'number' ? ` (${count})` : ''}
          </Button>
        </Box>
      </Box>
    </Slide>
  );
}

ActionBar.propTypes = {
  open: PropTypes.bool,
  primaryLabel: PropTypes.string.isRequired,
  onPrimary: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  count: PropTypes.number,
};