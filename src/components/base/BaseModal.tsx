import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useTheme } from '@mui/material/styles';

export interface BaseModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  variant?: 'confirm' | 'form';
}

// Simple modal wrapper with title + actions slots.
export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  title,
  onClose,
  actions,
  children,
  maxWidth,
  fullWidth = true,
  variant = 'confirm',
}) => {
  const theme = useTheme();
  const computedMaxWidth = maxWidth || (variant === 'form' ? 'sm' : 'xs');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={computedMaxWidth}
      fullWidth={fullWidth}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)'
        }
      }}
      PaperProps={{
        elevation: 16,
        sx: {
          bgcolor: theme.palette.mode === 'dark' ? '#1f2126' : '#ffffff',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 12px 32px rgba(0,0,0,0.7)'
              : '0 12px 32px rgba(0,0,0,0.25)'
        }
      }}
    >
      {title ? (
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2, letterSpacing: 0, lineHeight: 1.3 }}>
          {title}
        </DialogTitle>
      ) : null}
      <DialogContent sx={{ color: 'text.primary', '&&': { px: 3, pt: 2, pb: 2 } }}>{children}</DialogContent>
      {actions ? (
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5, gap: 1 }}>
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  );
};
