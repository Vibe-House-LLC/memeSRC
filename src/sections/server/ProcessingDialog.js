import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogTitle, LinearProgress, Typography, Button } from '@mui/material';

function ProcessingDialog({ isOpen, progress, metadata, onDismiss }) {
    return (
        <Dialog open={isOpen} maxWidth="sm" fullWidth>
            <DialogTitle>Processing Index</DialogTitle>
            <DialogContent>
                {progress < 100 ? (
                    <>
                        <Typography variant="body1">Processing your index...</Typography>
                        <Typography variant="body2">Title: {metadata.title}</Typography>
                        <Typography variant="body2">Description: {metadata.description}</Typography>
                        <LinearProgress variant="determinate" value={progress} sx={{ my: 2 }} />
                        <Typography>{progress}% completed</Typography>
                    </>
                ) : (
                    <>
                        <Typography variant="h6" gutterBottom>Processing Complete!</Typography>
                        <Typography variant="body1">Title: {metadata.title}</Typography>
                        <Typography variant="body2">Description: {metadata.description}</Typography>
                        <Button onClick={onDismiss} color="primary" variant="contained" sx={{ mt: 2 }}>Dismiss</Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

ProcessingDialog.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    progress: PropTypes.number.isRequired,
    metadata: PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
    }).isRequired,
    onDismiss: PropTypes.func.isRequired,
};

export default ProcessingDialog;
