import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, IconButton, Slide, Tooltip } from '@mui/material';

export default function ActionBar({ open, primaryLabel, onPrimary, disabled, count, onSecondary, secondaryAriaLabel = 'More options', secondaryIcon }) {
  return (
    <Slide direction="up" in={open} mountOnEnter unmountOnExit>
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
        bgcolor: 'rgba(17,18,20,0.9)', borderTop: '1px solid rgba(255,255,255,0.08)',
        p: 2, boxShadow: '0 -12px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)'
      }}>
        <Box sx={{ maxWidth: 960, mx: 'auto', display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={onPrimary}
            disabled={disabled}
            sx={{
              flex: 1,
              minHeight: 48,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
              border: '1px solid #8b5cc7',
              boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
              color: '#fff',
              '&:hover': { background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)' }
            }}
          >
            {primaryLabel}{typeof count === 'number' ? ` (${count})` : ''}
          </Button>
          {typeof onSecondary === 'function' && (
            <Tooltip title={secondaryAriaLabel} arrow>
              <span>
                <IconButton
                  aria-label={secondaryAriaLabel}
                  onClick={onSecondary}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    color: '#8b5cc7',
                    border: '1px solid rgba(139,92,199,0.45)',
                    bgcolor: 'rgba(139,92,199,0.08)',
                    '&:hover': { bgcolor: 'rgba(139,92,199,0.18)', borderColor: 'rgba(139,92,199,0.75)' }
                  }}
                >
                  {secondaryIcon}
                </IconButton>
              </span>
            </Tooltip>
          )}
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
  onSecondary: PropTypes.func,
  secondaryAriaLabel: PropTypes.string,
  secondaryIcon: PropTypes.node,
};
