import { useContext, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import LoadingButton from '@mui/lab/LoadingButton'
import { SnackbarContext } from '../../SnackbarContext'
import { API } from 'aws-amplify'

type SnackbarSeverity = 'success' | 'info' | 'warning' | 'error'

interface SnackbarContextValue {
  message: string
  setMessage: (message: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  severity: SnackbarSeverity
  setSeverity: (severity: SnackbarSeverity) => void
}

export interface ReindexConfirmationDialogProps {
  open: boolean
  alias: string
  onClose: () => void
}

export default function ReindexConfirmationDialog({ open, alias, onClose }: ReindexConfirmationDialogProps) {
  const snackbar = useContext(SnackbarContext) as SnackbarContextValue | null
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await API.post('publicapi', '/media/index', {
        body: { existingAlias: alias }
      });
      // Close dialog first
      onClose?.()
      // Notify via global snackbar
      if (snackbar) {
        snackbar.setSeverity('success')
        snackbar.setMessage(`"${alias}" reindexing has been started.`)
        snackbar.setOpen(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (!submitting) onClose?.()
  }

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="xs">
      <DialogTitle>Confirm reindex</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to reindex "{alias}"?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={submitting} color="inherit">Cancel</Button>
        <LoadingButton loading={submitting} onClick={handleConfirm} variant="contained" color="primary">
          Confirm
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}


